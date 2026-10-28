import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonthlyBars } from "@/components/charts";
import { PageHead, Stat } from "@/components/ui";
import { dateLabel, iso, num, rp } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type Inv = {
  invoice_date: string; customer_id: string; voucher_amount: number;
  customer: { name: string; area: string | null } | null;
  items: { qty: number; line_total: number; product: { name: string } | null }[];
};

export default async function GrowthPage() {
  await requireRole("owner", "admin");
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  const { data } = await supabase
    .from("invoices")
    .select("invoice_date,customer_id,voucher_amount,customer:customers(name,area),items:invoice_items(qty,line_total,product:products(name))")
    .gte("invoice_date", iso(since)).order("invoice_date");
  const invs = (data ?? []) as unknown as Inv[];
  const { data: cs } = await supabase.from("customers").select("id,name,area,repeat_days");

  const byMonth = new Map<string, { omzet: number; n: number; newC: number }>();
  const firstSeen = new Map<string, string>();
  const lastSeen = new Map<string, string>();
  const products = new Map<string, { qty: number; rev: number }>();
  const areas = new Map<string, number>();
  for (const i of invs) {
    const k = i.invoice_date.slice(0, 7);
    const b = byMonth.get(k) ?? { omzet: 0, n: 0, newC: 0 };
    b.omzet += i.items.reduce((a, x) => a + Number(x.line_total), 0) - Number(i.voucher_amount);
    b.n += 1;
    if (!firstSeen.has(i.customer_id)) { firstSeen.set(i.customer_id, k); b.newC += 1; }
    lastSeen.set(i.customer_id, i.invoice_date);
    byMonth.set(k, b);
    const area = i.customer?.area ?? "Tanpa area";
    areas.set(area, (areas.get(area) ?? 0) + i.items.reduce((a, x) => a + Number(x.line_total), 0));
    for (const it of i.items) {
      const name = it.product?.name ?? "?";
      const p = products.get(name) ?? { qty: 0, rev: 0 };
      p.qty += it.qty; p.rev += Number(it.line_total);
      products.set(name, p);
    }
  }
  const keys = [...byMonth.keys()].sort();
  const bars = keys.map((k) => ({ label: MONTHS[Number(k.slice(5)) - 1], omzet: byMonth.get(k)!.omzet, bersih: byMonth.get(k)!.newC * 0 }));
  const last = byMonth.get(keys[keys.length - 1]);
  const prev = byMonth.get(keys[keys.length - 2]);
  const growth = last && prev && prev.omzet > 0 ? (last.omzet - prev.omzet) / prev.omzet : null;

  const customers = new Map((cs ?? []).map((c) => [c.id as string, c as { name: string; area: string | null; repeat_days: string | null }]));
  const now = Date.now();
  const overdue = [...lastSeen.entries()].map(([id, d]) => {
    const days = Math.floor((now - new Date(d + "T00:00:00").getTime()) / 86400000);
    const every = parseInt(customers.get(id)?.repeat_days ?? "", 10);
    return { id, name: customers.get(id)?.name ?? "?", last: d, days, every };
  }).filter((x) => x.every && x.days > x.every).sort((a, b) => b.days - b.every - (a.days - a.every)).slice(0, 15);

  const topProducts = [...products.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 8);
  const topAreas = [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <>
      <PageHead eyebrow="Analisa · 12 bulan terakhir" title="Growth" />
      <section className="grid gap-6 sm:grid-cols-3">
        <Stat label="Pertumbuhan omzet" value={growth == null ? "—" : `${growth >= 0 ? "+" : ""}${(growth * 100).toFixed(1)}%`} sub="bulan terakhir vs sebelumnya" />
        <Stat label="Customer aktif" value={num(firstSeen.size)} sub="pernah transaksi dalam periode" />
        <Stat label="Customer baru bulan terakhir" value={num(last?.newC ?? 0)} sub={`${num(last?.n ?? 0)} invoice`} />
      </section>

      <section className="panel mt-8">
        <h2>Omzet per bulan</h2>
        <MonthlyBars data={bars.map((b) => ({ ...b, bersih: 0 }))} />
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-2">
        <div className="panel p-0">
          <h2 className="p-4 pb-2">Produk terlaris</h2>
          <table className="ledger"><thead><tr><th>Produk</th><th className="r">Qty</th><th className="r">Pendapatan</th></tr></thead>
            <tbody>{topProducts.map(([n, v]) => <tr key={n}><td>{n}</td><td className="r">{v.qty}</td><td className="r">{rp(v.rev)}</td></tr>)}</tbody></table>
        </div>
        <div className="panel p-0">
          <h2 className="p-4 pb-2">Area teratas</h2>
          <table className="ledger"><thead><tr><th>Area</th><th className="r">Pendapatan</th></tr></thead>
            <tbody>{topAreas.map(([n, v]) => <tr key={n}><td>{n}</td><td className="r">{rp(v)}</td></tr>)}</tbody></table>
        </div>
      </section>

      <section className="panel mt-8 p-0">
        <h2 className="p-4 pb-0">Perlu di-follow up</h2>
        <p className="px-4 pb-2 text-sm text-muted">Customer yang melewati siklus repeat-nya.</p>
        <table className="ledger">
          <thead><tr><th>Customer</th><th>Terakhir</th><th className="r">Siklus</th><th className="r">Sudah</th></tr></thead>
          <tbody>
            {overdue.map((o) => (
              <tr key={o.id}><td className="font-semibold">{o.name}</td><td>{dateLabel(o.last)}</td><td className="r">{o.every} hr</td>
                <td className="r"><span className="tag warn">{o.days} hr</span></td></tr>
            ))}
            {overdue.length === 0 && <tr><td colSpan={4} className="text-muted">Tidak ada customer yang terlambat.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
