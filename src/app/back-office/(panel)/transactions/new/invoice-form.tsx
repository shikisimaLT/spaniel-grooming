"use client";

import { useActionState, useMemo, useState } from "react";
import { createInvoice, updateInvoice } from "../actions";
import { num, rp } from "@/lib/format";

type Groomer = { id: string; name: string; commission_rate: number };
type Product = { id: string; code: string; name: string; category: string; commission_override: number | null };
type Price = { product_id: string; price: number; active_from: string; active_to: string | null };
// unit_price / commission_rate are snapshots kept from a saved invoice; cleared when the product changes.
type Line = { key: number; product_id: string; qty: number; discount: number; unit_price?: number; commission_rate?: number };
export type InitialInvoice = {
  id: string; date: string; customer: string; groomerId: string; voucherCode: string;
  voucherAmount: number; bonus: number; notes: string; lines: Line[];
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function InvoiceForm({ customers, groomers, products, prices, initial }: {
  customers: string[]; groomers: Groomer[]; products: Product[]; prices: Price[]; initial?: InitialInvoice;
}) {
  const [state, action, pending] = useActionState(initial ? updateInvoice : createInvoice, undefined);
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [groomerId, setGroomerId] = useState(initial?.groomerId ?? "");
  const [voucher, setVoucher] = useState(initial?.voucherAmount ?? 0);
  const [lines, setLines] = useState<Line[]>(initial?.lines.length ? initial.lines : [{ key: 1, product_id: "", qty: 1, discount: 0 }]);

  const isNew = customer.trim() !== "" && !customers.some((c) => c.toLowerCase() === customer.trim().toLowerCase());
  const groomer = groomers.find((g) => g.id === groomerId);

  const priceOn = (pid: string) =>
    prices
      .filter((p) => p.product_id === pid && p.active_from <= date && (!p.active_to || p.active_to >= date))
      .sort((a, b) => b.active_from.localeCompare(a.active_from))[0]?.price;

  const calc = useMemo(() => {
    let gross = 0, commission = 0;
    const rows = lines.map((l) => {
      const pr = l.product_id ? l.unit_price ?? priceOn(l.product_id) : undefined;
      const prod = products.find((p) => p.id === l.product_id);
      const total = pr != null ? pr * l.qty - l.discount : 0;
      const rate = l.commission_rate ?? prod?.commission_override ?? groomer?.commission_rate ?? 0;
      gross += total;
      commission += Math.round(total * rate);
      return { price: pr, total };
    });
    return { rows, gross, commission };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, date, groomerId, products, prices]);

  const upd = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const payload = JSON.stringify(lines.filter((l) => l.product_id).map(({ product_id, qty, discount, unit_price, commission_rate }) => ({ product_id, qty, discount, unit_price, commission_rate })));

  return (
    <form action={action} className="grid gap-8 xl:grid-cols-[1fr_20rem]">
      <input type="hidden" name="items" value={payload} />
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-6">
        <section className="panel grid gap-4 sm:grid-cols-3">
          <label className="field"><span>Tanggal</span>
            <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="field sm:col-span-1"><span>Customer</span>
            <input className="input" name="customer" list="customers" value={customer} onChange={(e) => setCustomer(e.target.value)}
              placeholder="Ketik atau pilih…" autoComplete="off" required />
            <datalist id="customers">{customers.map((c) => <option key={c} value={c} />)}</datalist>
            {isNew && <small className="mt-1 block text-moss">Customer baru — akan dibuat otomatis.</small>}
          </label>
          <label className="field"><span>Groomer</span>
            <select className="input" name="groomer_id" value={groomerId} onChange={(e) => setGroomerId(e.target.value)} required>
              <option value="">Pilih…</option>
              {groomers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select></label>
        </section>

        <section className="panel">
          <h2 className="mb-3">Item</h2>
          <div className="scroll-x">
            <table className="ledger">
              <thead><tr><th>Produk / add-on</th><th style={{ width: 70 }}>Qty</th><th className="r">Harga</th><th style={{ width: 120 }}>Potongan</th><th className="r">Total</th><th /></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.key}>
                    <td>
                      <select className="input" value={l.product_id} onChange={(e) => upd(l.key, { product_id: e.target.value, unit_price: undefined, commission_rate: undefined })} aria-label="Produk">
                        <option value="">Pilih…</option>
                        {["Jasa Utama", "Add-on"].map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {products.filter((p) => p.category === cat).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {l.product_id && calc.rows[i].price == null && <small className="text-danger">Belum ada harga untuk tanggal ini</small>}
                    </td>
                    <td><input className="input" type="number" min={1} value={l.qty} onChange={(e) => upd(l.key, { qty: Math.max(1, Number(e.target.value)) })} aria-label="Qty" /></td>
                    <td className="r">{calc.rows[i].price != null ? rp(calc.rows[i].price) : "—"}</td>
                    <td><input className="input" type="number" min={0} value={l.discount} onChange={(e) => upd(l.key, { discount: Math.max(0, Number(e.target.value)) })} aria-label="Potongan" /></td>
                    <td className="r">{rp(calc.rows[i].total)}</td>
                    <td className="r">{lines.length > 1 && <button type="button" className="text-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Hapus baris">✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn ghost sm mt-3" onClick={() => setLines((ls) => [...ls, { key: Date.now(), product_id: "", qty: 1, discount: 0 }])}>+ Tambah item</button>
        </section>

        <section className="panel grid gap-4 sm:grid-cols-4">
          <label className="field"><span>Kode voucher</span><input className="input" name="voucher_code" defaultValue={initial?.voucherCode} /></label>
          <label className="field"><span>Potongan voucher (Rp)</span>
            <input className="input" type="number" min={0} name="voucher_amount" value={voucher} onChange={(e) => setVoucher(Number(e.target.value))} /></label>
          <label className="field"><span>Bonus groomer (Rp)</span><input className="input" type="number" min={0} name="bonus" defaultValue={initial?.bonus ?? 0} /></label>
          {!initial && <label className="flex items-end gap-2 pb-2"><input type="checkbox" name="paid" /> Sudah lunas</label>}
          <label className="field sm:col-span-4"><span>Catatan</span><input className="input" name="notes" defaultValue={initial?.notes} /></label>
        </section>
      </div>

      <aside className="panel rule-top h-fit space-y-3 xl:sticky xl:top-6">
        <p className="eyebrow">Ringkasan</p>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{rp(calc.gross)}</dd></div>
          <div className="flex justify-between"><dt>Voucher</dt><dd className="num">−{num(voucher)}</dd></div>
        </dl>
        <p className="figure border-t border-rule pt-2 text-4xl">{rp(calc.gross - voucher)}</p>
        <p className="text-sm text-muted">Komisi groomer ≈ {rp(calc.commission)} <br />(voucher tidak memotong komisi)</p>
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <button className="btn w-full justify-center" disabled={pending}>{pending ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan invoice"}</button>
      </aside>
    </form>
  );
}
