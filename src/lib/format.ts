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
