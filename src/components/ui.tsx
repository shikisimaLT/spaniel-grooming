import Link from "next/link";

export type SortDir = "asc" | "desc";

export const parseSort = <T extends string>(sort: string | undefined, dir: string | undefined, allowed: readonly T[], fallback: T, fallbackDir: SortDir) => ({
  sort: (allowed as readonly string[]).includes(sort ?? "") ? (sort as T) : fallback,
  dir: (dir === "asc" || dir === "desc" ? dir : fallbackDir) as SortDir,
});

/** Table header cell that toggles ?sort=&dir= while keeping the other query params. */
export function SortTh({
  label, field, sort, dir, params, align,
}: {
  label: string; field: string; sort: string; dir: SortDir; params: Record<string, string | undefined>; align?: "r";
}) {
  const active = sort === field;
  const next: SortDir = active && dir === "asc" ? "desc" : "asc";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  qs.set("sort", field);
  qs.set("dir", next);
  return (
    <th className={align} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={`?${qs.toString()}`} className={`inline-flex items-center gap-1 hover:text-chestnut ${active ? "text-ink" : ""}`}>
        {label}
        <span aria-hidden className="text-[0.7rem]">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </Link>
    </th>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="rise mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Field({
  label, name, defaultValue, type = "text", required, placeholder, step, list,
}: {
  label: string; name: string; defaultValue?: string | number | null; type?: string;
  required?: boolean; placeholder?: string; step?: string; list?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" name={name} type={type} required={required} placeholder={placeholder}
        step={step} list={list} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rise rule-top pt-3">
      <p className="eyebrow">{label}</p>
      <p className="figure text-4xl leading-tight">{value}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Msg({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p role="alert" className="mb-4 border border-danger px-3 py-2 text-sm text-danger">{decodeURIComponent(error)}</p>;
  if (ok) return <p className="mb-4 border border-moss px-3 py-2 text-sm text-moss">{decodeURIComponent(ok)}</p>;
  return null;
}
