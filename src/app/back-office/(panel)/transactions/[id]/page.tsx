import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";
import { dateLabel, pct, rp } from "@/lib/format";

type Inv = {
  id: string; invoice_no: string; invoice_date: string; paid: boolean;
  voucher_code: string | null; voucher_amount: number; bonus: number; notes: string | null;
  proof_done: string | null; proof_transfer: string | null;
  customer: { name: string; phone: string | null; address: string | null; area: string | null } | null;
  groomer: { name: string; code: string } | null;
  items: {
    id: string; qty: number; unit_price: number; discount: number; commission_rate: number;
    line_total: number; commission: number; created_at: string;
    product: { code: string; name: string; category: string } | null;
  }[];
};

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getProfile();
  const staff = isStaff(me.role);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id,invoice_no,invoice_date,paid,voucher_code,voucher_amount,bonus,notes,proof_done,proof_transfer,customer:customers(name,phone,address,area),groomer:groomers(name,code),items:invoice_items(id,qty,unit_price,discount,commission_rate,line_total,commission,created_at,product:products(code,name,category))")
    .eq("id", id).maybeSingle();
  const inv = data as unknown as Inv | null;
  if (!inv) notFound();

  const items = [...inv.items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const gross = items.reduce((a, i) => a + Number(i.line_total), 0);
  const commission = items.reduce((a, i) => a + Number(i.commission), 0);
  const total = gross - Number(inv.voucher_amount);

  return (
    <>
      <PageHead eyebrow={`Transaksi · ${dateLabel(inv.invoice_date)}`} title={inv.invoice_no}>
        <div className="flex gap-2">
          <Link href="/back-office/transactions" className="btn ghost">← Kembali</Link>
          {staff && !inv.paid && <Link href={`/back-office/transactions/${inv.id}/edit`} className="btn">Ubah</Link>}
        </div>
      </PageHead>

      <section className="panel mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="eyebrow">Customer</p><p className="font-semibold">{inv.customer?.name}</p>
          <p className="text-sm text-muted">{[inv.customer?.area, inv.customer?.phone].filter(Boolean).join(" · ") || "—"}</p>
          {inv.customer?.address && <p className="text-sm text-muted">{inv.customer.address}</p>}</div>
        <div><p className="eyebrow">Groomer</p><p className="font-semibold">{inv.groomer?.name}</p>
          <p className="text-sm text-muted">{inv.groomer?.code}</p></div>
        <div><p className="eyebrow">Status</p>
          <p><span className={`tag ${inv.paid ? "ok" : "warn"}`}>{inv.paid ? "Lunas · terkunci" : "Belum lunas"}</span></p></div>
        <div><p className="eyebrow">Catatan</p><p>{inv.notes || "—"}</p>
          {(inv.proof_done || inv.proof_transfer) && (
            <p className="text-sm text-muted">Selesai: {inv.proof_done || "—"} · Transfer: {inv.proof_transfer || "—"}</p>
          )}</div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <div className="scroll-x panel p-0">
          <table className="ledger">
            <thead>
              <tr><th>#</th><th>Produk</th><th className="r">Qty</th><th className="r">Harga</th><th className="r">Potongan</th><th className="r">Total</th>
                {staff && <><th className="r">Rate</th><th className="r">Komisi</th></>}</tr>
            </thead>
            <tbody>
              {items.map((i, n) => (
                <tr key={i.id}>
                  <td className="text-muted">{n + 1}</td>
                  <td><span className="font-semibold">{i.product?.name}</span>
                    <span className="block text-xs text-muted">{i.product?.code} · {i.product?.category}</span></td>
                  <td className="r">{i.qty}</td>
                  <td className="r">{rp(i.unit_price)}</td>
                  <td className="r">{Number(i.discount) > 0 ? `−${rp(i.discount)}` : "—"}</td>
                  <td className="r font-semibold">{rp(i.line_total)}</td>
                  {staff && <><td className="r">{pct(i.commission_rate)}</td><td className="r">{rp(i.commission)}</td></>}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={staff ? 8 : 6} className="text-muted">
                  Belum ada item pada invoice ini.{staff && !inv.paid && " Klik Ubah untuk menambahkan."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="panel rule-top h-fit space-y-2">
          <p className="eyebrow">Ringkasan</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="num">{rp(gross)}</dd></div>
            <div className="flex justify-between"><dt>Voucher{inv.voucher_code ? ` (${inv.voucher_code})` : ""}</dt><dd className="num">−{rp(inv.voucher_amount)}</dd></div>
          </dl>
          <p className="figure border-t border-rule pt-2 text-4xl">{rp(total)}</p>
          {staff && (
            <dl className="space-y-1 border-t border-rule pt-2 text-sm">
              <div className="flex justify-between"><dt>Komisi groomer</dt><dd className="num">{rp(commission)}</dd></div>
              <div className="flex justify-between"><dt>Bonus</dt><dd className="num">{rp(inv.bonus)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Take home</dt><dd className="num">{rp(commission + Number(inv.bonus))}</dd></div>
            </dl>
          )}
        </aside>
      </div>
    </>
  );
}
