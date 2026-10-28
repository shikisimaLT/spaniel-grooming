// Impor data Excel Spaniel Grooming ke Supabase (login sebagai owner, RLS tetap berlaku).
//   Cek dulu tanpa menulis:  node scripts/import-excel.mjs "<file.xlsx>" --dry
//   Impor sungguhan:         node --env-file=.env.local scripts/import-excel.mjs "<file.xlsx>"
// Butuh IMPORT_EMAIL & IMPORT_PASSWORD (akun owner) di .env.local. Sheet "Tino" diabaikan.
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) throw new Error("Usage: node scripts/import-excel.mjs <file.xlsx> [--dry]");

const wb = XLSX.readFile(file);
const grid = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
const str = (v) => (v == null ? null : String(v).trim() || null);
const isoFromSerial = (s) => new Date(Math.round((s - 25569) * 86400000)).toISOString().slice(0, 10);
const key = (n) => String(n ?? "").trim().toLowerCase();
const warn = [];

// --- masters
const products = grid("Master_Produk").slice(4).filter((r) => r[0] && r[1]).map((r) => ({
  code: str(r[0]), name: str(r[1]), category: str(r[2]) === "Add-on" ? "Add-on" : "Jasa Utama",
  active: str(r[3]) !== "Nonaktif" && str(r[3]) !== "Tidak Aktif",
  commission_override: typeof r[5] === "number" ? r[5] : null,
}));
const prices = grid("Master_Harga").slice(4).filter((r) => r[0] && typeof r[2] === "number" && typeof r[3] === "number").map((r) => ({
  code: str(r[0]), price: r[2], active_from: isoFromSerial(r[3]), active_to: typeof r[4] === "number" ? isoFromSerial(r[4]) : null,
})).sort((a, b) => a.active_from.localeCompare(b.active_from));
const groomers = grid("Master_Groomer").slice(4).filter((r) => r[0] && r[1]).map((r) => ({
  code: str(r[0]), name: str(r[1]), commission_rate: typeof r[2] === "number" ? r[2] : 0.25,
  active: str(r[3]) === "Aktif", phone: str(r[4]), notes: str(r[5]),
}));
const customers = new Map();
for (const r of grid("Master_Customer").slice(4)) {
  if (!r[1]) continue;
  const k = key(r[1]);
  if (customers.has(k)) continue;
  const dash = (v) => (str(v) === "-" ? null : str(v));
  customers.set(k, {
    name: str(r[1]), phone: dash(r[2]), address: dash(r[3]), area: str(r[4]),
    customer_status: str(r[5]) === "Lama" ? "Lama" : "Baru",
    repeat_order: ["Y", "N", "T"].includes(str(r[6])) ? str(r[6]) : null,
    repeat_days: str(r[7]), notes: str(r[8]), pet_breed: str(r[9]), pet_notes: str(r[10]),
    pet_count: typeof r[11] === "number" ? r[11] : null,
  });
}

// --- transactions
const invoices = [];
const items = [];
for (const sheet of wb.SheetNames.filter((n) => /^Invoice_2026_\d\d$/.test(n))) {
  const itemSheet = sheet.replace("Invoice_", "Item_");
  for (const r of grid(sheet).slice(4)) {
    if (!r[2] || !r[3] || typeof r[1] !== "number") continue;
    const no = str(r[0]);
    if (!no) { warn.push(`${sheet}: baris tanpa nomor untuk ${r[2]}`); continue; }
    invoices.push({
      invoice_no: no, invoice_date: isoFromSerial(r[1]), customer: String(r[2]).trim(), groomer_code: str(r[3]),
      voucher_code: str(r[5]), voucher_amount: typeof r[6] === "number" ? r[6] : 0, bonus: typeof r[9] === "number" ? r[9] : 0,
      paid: str(r[11]) === "Lunas", proof_done: str(r[12]), proof_transfer: str(r[13]), notes: str(r[14]),
    });
  }
  for (const r of grid(itemSheet).slice(4)) {
    if (!r[1] || !r[2]) continue;
    if (typeof r[5] !== "number") { warn.push(`${itemSheet}: harga tidak valid untuk ${r[1]} ${r[2]}`); continue; }
    items.push({
      invoice_no: str(r[1]), code: str(r[2]), qty: typeof r[3] === "number" ? r[3] : 1, unit_price: r[5],
      discount: typeof r[6] === "number" ? r[6] : 0, commission_rate: typeof r[8] === "number" ? r[8] : 0.25, notes: str(r[11]),
    });
  }
}
for (const inv of invoices) if (!customers.has(key(inv.customer))) customers.set(key(inv.customer), { name: inv.customer, customer_status: "Baru" });

// --- expenses (Expense sheet: A = dd-mm-yyyy)
const expenses = grid("Expense").slice(4).filter((r) => r[1] && typeof r[2] === "number" && /^\d\d-\d\d-\d{4}$/.test(String(r[0]))).map((r) => {
  const [d, m, y] = String(r[0]).split("-");
  return { expense_date: `${y}-${m}-${d}`, name: str(r[1]), amount: r[2], notes: str(r[5]) };
});

// --- bensin per groomer per periode (Rekap_Tahunan, blok mulai baris 34)
const MONTH = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
const fuel = [];
let curG = null;
for (const r of grid("Rekap_Tahunan").slice(33, 140)) {
  if (typeof r[0] === "string" && /^G\d+$/.test(r[0])) curG = r[0];
  const m = /^(\w+)\s+(\d+)-(\d+)$/.exec(String(r[2] ?? ""));
  if (curG && m && MONTH[m[1].toLowerCase()] && typeof r[6] === "number" && r[6] > 0) {
    const mo = MONTH[m[1].toLowerCase()];
    const last = new Date(2026, mo, 0).getDate();
    const day = Math.min(Number(m[3]), last);
    fuel.push({ groomer_code: curG, log_date: `2026-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`, trips: r[6] });
  }
}

// --- sanity totals per bulan
const itemsByInv = new Map();
for (const it of items) (itemsByInv.get(it.invoice_no) ?? itemsByInv.set(it.invoice_no, []).get(it.invoice_no)).push(it);
const month = {};
for (const inv of invoices) {
  const k = inv.invoice_date.slice(0, 7);
  const its = itemsByInv.get(inv.invoice_no) ?? [];
  const gross = its.reduce((a, i) => a + i.unit_price * i.qty - i.discount, 0);
  const comm = its.reduce((a, i) => a + Math.round((i.unit_price * i.qty - i.discount) * i.commission_rate), 0);
  month[k] ??= { invoices: 0, omzet: 0, komisi: 0 };
  month[k].invoices++; month[k].omzet += gross - inv.voucher_amount; month[k].komisi += comm;
}
console.log({ products: products.length, prices: prices.length, groomers: groomers.length, customers: customers.size,
  invoices: invoices.length, items: items.length, expenses: expenses.length, fuel: fuel.length });
console.table(month);
if (warn.length) console.warn("Peringatan:\n" + warn.join("\n"));
if (dry) process.exit(0);

// --- write
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email: process.env.IMPORT_EMAIL, password: process.env.IMPORT_PASSWORD });
if (authErr) throw authErr;
const { data: me } = await supabase.from("profiles").select("role").single();
if (me?.role !== "owner") throw new Error("Akun impor harus owner");
const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
if (count) throw new Error("Tabel products sudah berisi data — impor dibatalkan agar tidak dobel.");

const must = ({ data, error }, what) => { if (error) throw new Error(`${what}: ${error.message}`); return data; };
const chunks = (arr, n = 200) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

const prodRows = must(await supabase.from("products").insert(products).select("id,code"), "products");
const pid = new Map(prodRows.map((p) => [p.code, p.id]));
const priceRows = prices.filter((p) => pid.has(p.code)).map(({ code, ...p }) => ({ product_id: pid.get(code), ...p }));
for (const c of chunks(priceRows)) must(await supabase.from("product_prices").insert(c), "prices");

const grRows = must(await supabase.from("groomers").insert(groomers).select("id,code"), "groomers");
const gid = new Map(grRows.map((g) => [g.code, g.id]));
const custRows = [];
for (const c of chunks([...customers.values()])) custRows.push(...must(await supabase.from("customers").insert(c).select("id,name"), "customers"));
const cid = new Map(custRows.map((c) => [key(c.name), c.id]));

const invRows = [];
const invPayload = invoices.filter((i) => gid.has(i.groomer_code)).map(({ customer, groomer_code, ...i }) => ({
  ...i, customer_id: cid.get(key(customer)), groomer_id: gid.get(groomer_code),
}));
for (const c of chunks(invPayload)) invRows.push(...must(await supabase.from("invoices").insert(c).select("id,invoice_no"), "invoices"));
const iid = new Map(invRows.map((i) => [i.invoice_no, i.id]));

const itemPayload = items.filter((i) => iid.has(i.invoice_no) && pid.has(i.code)).map(({ invoice_no, code, ...i }) => ({
  ...i, invoice_id: iid.get(invoice_no), product_id: pid.get(code),
}));
for (const c of chunks(itemPayload)) must(await supabase.from("invoice_items").insert(c), "invoice_items");
if (expenses.length) must(await supabase.from("expenses").insert(expenses), "expenses");
const fuelRows = fuel.filter((f) => gid.has(f.groomer_code)).map(({ groomer_code, ...f }) => ({ groomer_id: gid.get(groomer_code), ...f }));
if (fuelRows.length) must(await supabase.from("fuel_logs").insert(fuelRows), "fuel_logs");
console.log(`Selesai: ${invRows.length} invoice, ${itemPayload.length} item diimpor.`);
