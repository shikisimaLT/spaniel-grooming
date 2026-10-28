import Link from "next/link";
import { getProfile, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Msg, PageHead, SortTh, parseSort } from "@/components/ui";
import { currentMonth, dateLabel, monthRange, rp } from "@/lib/format";
import { deleteInvoice, togglePaid } from "./actions";

const SORTS = ["no", "date", "customer", "groomer", "total", "commission", "status"] as const;

type Row = {
  id: string; invoice_no: string; invoice_date: string; paid: boolean; voucher_amount: number; bonus: number;
  customer: { name: string } | null; groomer: { name: string } | null;
  items: { line_total: number; commission: number }[];
};

export default async function TransactionsPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; sort?: string; dir?: string; error?: string; ok?: string }> }) {
  const me = await getProfile();
  const { m = currentMonth(), error, ok, ...sp } = await searchParams;
  const { sort, dir } = parseSort(sp.sort, sp.dir, SORTS, "date", "desc");
  const { from, to } = monthRange(m);
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id,invoice_no,invoice_date,paid,voucher_amount,bonus,customer:customers(name),groomer:groomers(name),items:invoice_items(line_total,commission)")
    .gte("invoice_date", from).lte("invoice_date", to)
    .order("invoice_date", { ascending: false }).order("invoice_no", { ascending: false });
  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const gross = r.items.reduce((a, i) => a + Number(i.line_total), 0);
    return { ...r, total: gross - Number(r.voucher_amount), commission: r.items.reduce((a, i) => a + Number(i.commission), 0) };
  });
  const sortValue = (r: (typeof rows)[number]): string | number => {
    switch (sort) {
      case "no": return r.invoice_no;
      case "customer": return r.customer?.name.toLowerCase() ?? "";
      case "groomer": return r.groomer?.name.toLowerCase() ?? "";
      case "total": return r.total;
      case "commission": return r.commission;
      case "status": return r.paid ? 1 : 0;
      default: return r.invoice_date + r.invoice_no;
    }
  };
  rows.sort((a, b) => {
    const x = sortValue(a), y = sortValue(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id", { numeric: true });
    return dir === "asc" ? c : -c;
  });
  const sum = rows.reduce((a, r) => a + r.total, 0);
  const staff = isStaff(me.role);
  const th = { sort, dir, params: { m } };

  return (
    <>
      <PageHead eyebrow="Harian" title="Transaksi">
        <div className="flex flex-wrap items-end gap-2">
          <form className="flex gap-2">
            <input className="input" type="month" name="m" defaultValue={m} aria-label="Bulan" />
            <button className="btn ghost">Tampilkan</button>
          </form>
          <Link href="/back-office/transactions/new" className="btn">+ Transaksi baru</Link>
        </div>
      </PageHead>
      <Msg error={error} ok={ok} />
      <p className="mb-3 text-sm text-muted">Invoice yang belum lunas masih bisa diubah atau dihapus. Klik status "Lunas" untuk mengunci; klik lagi untuk membukanya.</p>
      <p className="mb-3 text-muted">{rows.length} invoice · omzet <b className="figure text-ink">{rp(sum)}</b></p>
      <div className="scroll-x panel p-0">
        <table className="ledger">
          <thead>
            <tr>
              <SortTh label="No." field="no" {...th} />
              <SortTh label="Tanggal" field="date" {...th} />
              <SortTh label="Customer" field="customer" {...th} />
              <SortTh label="Groomer" field="groomer" {...th} />
              <SortTh label="Total" field="total" align="r" {...th} />
              {staff && <SortTh label="Komisi" field="commission" align="r" {...th} />}
              <SortTh label="Status" field="status" {...th} />
              {staff && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-sm"><Link className="underline hover:text-chestnut" href={`/back-office/transactions/${r.id}`}>{r.invoice_no}</Link></td>
                <td>{dateLabel(r.invoice_date)}</td>
                <td className="font-semibold"><Link href={`/back-office/transactions/${r.id}`}>{r.customer?.name}</Link></td>
                <td>{r.groomer?.name}</td>
                <td className="r">{rp(r.total)}{Number(r.voucher_amount) > 0 && <span className="block text-xs text-muted">voucher −{rp(r.voucher_amount)}</span>}</td>
                {staff && <td className="r">{rp(r.commission)}{Number(r.bonus) > 0 && <span className="block text-xs text-muted">bonus {rp(r.bonus)}</span>}</td>}
                <td>
                  {staff ? (
                    <form action={togglePaid}>
                      <input type="hidden" name="id" value={r.id} /><input type="hidden" name="paid" value={String(r.paid)} />
                      <button className={`tag ${r.paid ? "ok" : "warn"} cursor-pointer`} title="Klik untuk ubah status">{r.paid ? "Lunas" : "Belum"}</button>
                    </form>
                  ) : <span className={`tag ${r.paid ? "ok" : "warn"}`}>{r.paid ? "Lunas" : "Belum"}</span>}
                </td>
                {staff && (
                  <td className="r whitespace-nowrap">
                    {r.paid ? (
                      <span className="text-sm text-muted" title="Sudah lunas, terkunci">Terkunci</span>
                    ) : (
                      <>
                        <Link className="text-sm underline" href={`/back-office/transactions/${r.id}/edit`}>Ubah</Link>{" · "}
                        <form action={deleteInvoice} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-sm text-danger underline">Hapus</button>
                        </form>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="text-muted">Belum ada transaksi bulan ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
