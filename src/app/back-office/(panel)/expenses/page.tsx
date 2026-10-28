import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Field, Msg, PageHead } from "@/components/ui";
import { currentMonth, dateLabel, monthRange, rp, today } from "@/lib/format";
import { addExpense, deleteExpense } from "./actions";

export default async function ExpensesPage({
  searchParams,
}: { searchParams: Promise<{ m?: string; error?: string }> }) {
  await requireRole("owner", "admin");
  const { m = currentMonth(), error } = await searchParams;
  const { from, to } = monthRange(m);
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*").gte("expense_date", from).lte("expense_date", to).order("expense_date", { ascending: false });
  const rows = (data ?? []) as { id: string; expense_date: string; name: string; amount: number; notes: string | null }[];
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);

  return (
    <>
      <PageHead eyebrow="Harian" title="Expense operasional">
        <form className="flex gap-2">
          <input className="input" type="month" name="m" defaultValue={m} aria-label="Bulan" />
          <button className="btn ghost">Tampilkan</button>
        </form>
      </PageHead>
      <Msg error={error} />
      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div className="scroll-x panel p-0">
          <table className="ledger">
            <thead><tr><th>Tanggal</th><th>Pengeluaran</th><th className="r">Jumlah</th><th>Keterangan</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{dateLabel(r.expense_date)}</td><td className="font-semibold">{r.name}</td><td className="r">{rp(r.amount)}</td><td>{r.notes}</td>
                  <td className="r"><form action={deleteExpense}><input type="hidden" name="id" value={r.id} /><button className="text-sm text-danger underline">Hapus</button></form></td>
                </tr>
              ))}
              <tr><td className="font-bold" colSpan={2}>Total</td><td className="r figure text-lg font-bold">{rp(total)}</td><td colSpan={2} /></tr>
            </tbody>
          </table>
        </div>
        <form action={addExpense} className="panel space-y-3 self-start">
          <h2>Catat pengeluaran</h2>
          <Field label="Tanggal" name="expense_date" type="date" defaultValue={today()} required />
          <Field label="Nama" name="name" required placeholder="Listrik, sewa, gaji admin…" />
          <Field label="Jumlah (Rp)" name="amount" type="number" required />
          <Field label="Keterangan" name="notes" />
          <button className="btn">Simpan</button>
          <p className="text-sm text-muted">Dibagi rata ke groomer aktif pada halaman BOD.</p>
        </form>
      </div>
    </>
  );
}
