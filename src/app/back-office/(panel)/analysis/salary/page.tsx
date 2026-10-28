import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Msg, PageHead } from "@/components/ui";
import { PeriodPicker } from "@/components/period-picker";
import { readPeriod, rp } from "@/lib/format";
import { groomerSummary, totals } from "@/lib/summary";

export default async function SalaryPage({
  searchParams,
}: { searchParams: Promise<{ mode?: string; date?: string; from?: string; to?: string; error?: string }> }) {
  await requireRole("owner", "admin");
  const sp = await searchParams;
  const period = readPeriod(sp);
  const supabase = await createClient();
  const rows = await groomerSummary(supabase, period.from, period.to);
  const t = totals(rows);

  return (
    <>
      <PageHead eyebrow="Analisa" title="Gaji groomer" />
      <Msg error={sp.error} />
      <PeriodPicker {...period} />

      <div className="scroll-x panel p-0">
        <table className="ledger">
          <thead>
            <tr><th>Groomer</th><th className="r">Invoice</th><th className="r">Omzet</th><th className="r">Komisi</th><th className="r">Bonus</th>
              <th className="r">Bensin</th><th className="r">Take home</th><th className="r">Bersih</th></tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.groomer_id}>
                <td className="font-semibold">{g.groomer_name}</td>
                <td className="r">{g.invoices}</td>
                <td className="r">{rp(g.omzet)}</td>
                <td className="r">{rp(g.commission)}</td>
                <td className="r">{rp(g.bonus)}</td>
                <td className="r">{rp(g.fuel)} <span className="text-xs text-muted">({g.trips} hari)</span></td>
                <td className="r figure text-lg">{rp(g.take_home)}</td>
                <td className="r">{rp(g.bersih)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-bold">Total</td><td className="r">{t.invoices}</td><td className="r font-bold">{rp(t.omzet)}</td>
              <td className="r font-bold">{rp(t.commission)}</td><td className="r font-bold">{rp(t.bonus)}</td><td className="r font-bold">{rp(t.fuel)}</td>
              <td className="r figure text-lg font-bold">{rp(t.take_home)}</td><td className="r font-bold">{rp(t.bersih)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        Bensin otomatis: tiap hari seorang groomer punya invoice berisi item = 1 hari kerja × Rp20.000. Tidak ada input manual.
      </p>
    </>
  );
}
