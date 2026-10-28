import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BubbleChart, MonthlyBars } from "@/components/charts";
import { PageHead, Stat } from "@/components/ui";
import { currentMonth, monthRange, num, pct, rp } from "@/lib/format";
import { groomerSummary, totals } from "@/lib/summary";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function lastMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireRole("owner", "admin");
  const { m = currentMonth() } = await searchParams;
  const supabase = await createClient();
  const { from, to } = monthRange(m);
  const months = lastMonths(m, 6);

  const [cur, ...trend] = await Promise.all([
    groomerSummary(supabase, from, to),
    ...months.map((mm) => groomerSummary(supabase, monthRange(mm).from, monthRange(mm).to)),
  ]);
  const { data: exp } = await supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to);
  const expense = (exp ?? []).reduce((a, e) => a + Number(e.amount), 0);

  const t = totals(cur);
  const ranked = [...cur].sort((a, b) => b.omzet - a.omzet);
  const bars = months.map((mm, i) => {
    const tt = totals(trend[i]);
    return { label: MONTHS[Number(mm.slice(5)) - 1], omzet: tt.omzet, bersih: tt.bersih };
  });

  return (
    <>
      <PageHead eyebrow={`Ringkasan · ${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`} title="Dashboard">
        <form className="flex gap-2">
          <input className="input" type="month" name="m" defaultValue={m} aria-label="Bulan" />
          <button className="btn ghost">Tampilkan</button>
        </form>
      </PageHead>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Omzet" value={rp(t.omzet)} sub={`${num(t.invoices)} invoice`} />
        <Stat label="Bersih" value={rp(t.bersih)} sub="setelah komisi, bonus, bensin" />
        <Stat label="Komisi + bonus" value={rp(t.commission + t.bonus)} sub={`bensin ${rp(t.fuel)}`} />
        <Stat label="Expense operasional" value={rp(expense)} sub={`bersih − expense: ${rp(t.bersih - expense)}`} />
      </section>

      <section className="mt-10 grid gap-8 xl:grid-cols-2">
        <div className="panel">
          <h2>Omzet vs bersih per groomer</h2>
          <p className="mb-2 text-sm text-muted">Ukuran gelembung = komisi.</p>
          <BubbleChart data={cur.filter((g) => g.omzet > 0).map((g) => ({ label: g.groomer_name, x: g.omzet, y: g.bersih, size: g.commission }))} />
        </div>
        <div className="panel">
          <h2>6 bulan terakhir</h2>
          <p className="mb-2 text-sm text-muted"><span className="inline-block h-2 w-3 bg-ink" /> omzet · <span className="inline-block h-2 w-3 bg-chestnut" /> bersih</p>
          <MonthlyBars data={bars} />
        </div>
      </section>

      <section className="panel mt-8 p-0">
        <h2 className="p-4 pb-2">Top groomer</h2>
        <div className="scroll-x">
          <table className="ledger">
            <thead><tr><th>#</th><th>Groomer</th><th className="r">Invoice</th><th className="r">Omzet</th><th className="r">Komisi</th><th className="r">Bonus</th><th className="r">Take home</th><th className="r">Porsi omzet</th></tr></thead>
            <tbody>
              {ranked.map((g, i) => (
                <tr key={g.groomer_id}>
                  <td className="figure">{i + 1}</td>
                  <td className="font-semibold">{g.groomer_name}</td>
                  <td className="r">{g.invoices}</td>
                  <td className="r">{rp(g.omzet)}</td>
                  <td className="r font-semibold">{rp(g.commission)}</td>
                  <td className="r">{rp(g.bonus)}</td>
                  <td className="r">{rp(g.take_home)}</td>
                  <td className="r">{t.omzet ? pct(g.omzet / t.omzet) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
