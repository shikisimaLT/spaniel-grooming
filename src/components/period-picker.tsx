import Link from "next/link";
import { PERIOD_MODES, addDays, dateLabel, type PeriodMode } from "@/lib/format";

/** Period selector shared by Gaji and BOD: weekly, twice-monthly (1-15 / 16-end) or a custom date range. */
export function PeriodPicker({ mode, date, from, to }: { mode: PeriodMode; date: string; from: string; to: string }) {
  return (
    <div className="panel mb-6 space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Jenis periode">
        {PERIOD_MODES.map((m) => (
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
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-muted">Periode: <b className="text-ink">{dateLabel(from)} – {dateLabel(to)}</b></p>
        {mode !== "custom" && (
          <span className="flex gap-2 text-sm">
            <Link className="underline" href={`?mode=${mode}&date=${addDays(from, -1)}`}>← Sebelumnya</Link>
            <Link className="underline" href={`?mode=${mode}&date=${addDays(to, 1)}`}>Berikutnya →</Link>
          </span>
        )}
      </div>
    </div>
  );
}
