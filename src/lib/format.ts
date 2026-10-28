const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const rp = (n: number | null | undefined) => `Rp${idr.format(Math.round(Number(n ?? 0)))}`;
export const num = (n: number | null | undefined) => idr.format(Math.round(Number(n ?? 0)));
export const pct = (n: number | null | undefined) => `${(Number(n ?? 0) * 100).toFixed(0)}%`;

export const dateLabel = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const today = () => iso(new Date());

export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
}

export const currentMonth = () => today().slice(0, 7);

export type PeriodMode = "week" | "half" | "custom";

export const PERIOD_MODES: { id: PeriodMode; label: string }[] = [
  { id: "week", label: "Mingguan" },
  { id: "half", label: "2 mingguan (1–15 / 16–akhir)" },
  { id: "custom", label: "Per tanggal" },
];

export function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Read ?mode=&date=&from=&to= from a page's searchParams and resolve the date range. Default: current 1-15 / 16-end half. */
export function readPeriod(sp: { mode?: string; date?: string; from?: string; to?: string }) {
  const mode: PeriodMode = PERIOD_MODES.some((m) => m.id === sp.mode) ? (sp.mode as PeriodMode) : "half";
  const date = sp.date || today();
  const { from, to } = resolvePeriod(mode, date, sp.from, sp.to);
  return { mode, date, from, to };
}

/** Resolve a salary period. week = Mon-Sun containing `date`; half = 1-15 or 16-end. */
export function resolvePeriod(mode: PeriodMode, date: string, from?: string, to?: string) {
  const d = new Date(date + "T00:00:00");
  if (mode === "week") {
    const dow = (d.getDay() + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end) };
  }
  if (mode === "half") {
    const y = d.getFullYear(), m = d.getMonth();
    return d.getDate() <= 15
      ? { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m, 15)) }
      : { from: iso(new Date(y, m, 16)), to: iso(new Date(y, m + 1, 0)) };
  }
  return { from: from || date, to: to || date };
}
