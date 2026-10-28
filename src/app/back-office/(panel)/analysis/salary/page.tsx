import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Msg, PageHead } from "@/components/ui";
import { dateLabel, resolvePeriod, rp, today, type PeriodMode } from "@/lib/format";
import { groomerSummary, totals } from "@/lib/summary";
import { saveFuel } from "./actions";

const MODES: { id: PeriodMode; label: string }[] = [
  { id: "week", label: "Mingguan" },
  { id: "half", label: "2 mingguan (1–15 / 16–akhir)" },
  { id: "custom", label: "Per tanggal" },
];

export default async function SalaryPage({
  searchParams,
}: { searchParams: Promise<{ mode?: PeriodMode; date?: string; from?: string; to?: string; error?: string }> }) {
  await requireRole("owner", "admin");
  const sp = await searchParams;
  const mode: PeriodMode = sp.mode && MODES.some((m) => m.id === sp.mode) ? sp.mode : "half";
  const date = sp.date || today();
  const { from, to } = resolvePeriod(mode, date, sp.from, sp.to);
  const supabase = await createClient();
  const rows = await groomerSummary(supabase, from, to);
  const t = totals(rows);
  const { data: endLogs } = await supabase.from("fuel_logs").select("groomer_id,trips").eq("log_date", to);
  const endTrips = new Map((endLogs ?? []).map((l) => [l.groomer_id as string, Number(l.trips)]));
  const back = `mode=${mode}&date=${date}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`;

  return (
    <>
      <PageHead eyebrow="Analisa" title="Gaji groomer" />
      <Msg error={sp.error} />
      <div className="panel mb-6 space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Jenis periode">
          {MODES.map((m) => (
            <Link key={m.id} href={`?mode=${m.id}&date=${date}`} role="tab" aria-selected={mode === m.id}
              className={`btn sm ${mode === m.id ? "" : "ghost"}`}>{m.label}</Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="mode" value={mode} />
          {mode === "custom" ? (
            <>
              <label className="field"><span>Dari</span><input className="input" type="date" name="from" defaultValue={from} /></label>
              <label className="field"><span>Sampai</span><input className="input" type="date" name="to" defaultValue={to} /></label>
            </>
          ) : (
            <label className="field"><span>Tanggal acuan</span><input className="input" type="date" name="date" defaultValue={date} /></label>
          )}
          <button className="btn">Hitung</button>
        </form>
        <p className="text-muted">Periode: <b className="text-ink">{dateLabel(from)} – {dateLabel(to)}</b></p>
      </div>

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
                <td className="r">{rp(g.fuel)} <span className="text-xs text-muted">({g.trips}×)</span></td>
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

      <form action={saveFuel} className="panel mt-8 space-y-3">
        <h2>Jumlah bensin periode ini</h2>
        <p className="text-sm text-muted">Dicatat pada tanggal akhir periode ({dateLabel(to)}). Uang bensin = jumlah × tarif (default Rp20.000).</p>
        <input type="hidden" name="log_date" value={to} />
        <input type="hidden" name="back" value={back} />
        <div className="flex flex-wrap gap-4">
          {rows.map((g) => (
            <label className="field w-28" key={g.groomer_id}><span>{g.groomer_name}</span>
              <input className="input" type="number" min={0} name={`trips_${g.groomer_id}`} defaultValue={endTrips.get(g.groomer_id) ?? 0} /></label>
          ))}
        </div>
        <button className="btn">Simpan bensin</button>
      </form>
    </>
  );
}
