import { num } from "@/lib/format";

type Bubble = { label: string; x: number; y: number; size: number };

/** Bubble chart: x = omzet, y = bersih, radius = komisi. Pure SVG, no library. */
export function BubbleChart({ data }: { data: Bubble[] }) {
  const W = 640, H = 340, pad = { l: 64, r: 24, t: 20, b: 44 };
  const maxX = Math.max(1, ...data.map((d) => d.x)) * 1.15;
  const maxY = Math.max(1, ...data.map((d) => d.y)) * 1.15;
  const maxS = Math.max(1, ...data.map((d) => d.size));
  const sx = (v: number) => pad.l + (v / maxX) * (W - pad.l - pad.r);
  const sy = (v: number) => H - pad.b - (v / maxY) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bubble omzet terhadap bersih per groomer" className="w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(maxY * t)} y2={sy(maxY * t)} stroke="var(--rule)" />
          <text x={pad.l - 8} y={sy(maxY * t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{num(maxY * t / 1000)}k</text>
          <text x={sx(maxX * t)} y={H - pad.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">{num(maxX * t / 1000)}k</text>
        </g>
      ))}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">Omzet →</text>
      <text x={14} y={H / 2} fontSize="11" fill="var(--muted)" transform={`rotate(-90 14 ${H / 2})`} textAnchor="middle">Bersih →</text>
      {data.map((d, i) => {
        const r = 12 + Math.sqrt(d.size / maxS) * 34;
        return (
          <g key={d.label}>
            <circle cx={sx(d.x)} cy={sy(d.y)} r={r} fill={i % 2 ? "var(--moss)" : "var(--chestnut)"} fillOpacity="0.28" stroke={i % 2 ? "var(--moss)" : "var(--chestnut)"} strokeWidth="1.5">
              <title>{`${d.label}: omzet Rp${num(d.x)}, bersih Rp${num(d.y)}, komisi Rp${num(d.size)}`}</title>
            </circle>
            <text x={sx(d.x)} y={sy(d.y) + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Paired bars per month: omzet vs bersih. */
export function MonthlyBars({ data }: { data: { label: string; omzet: number; bersih: number }[] }) {
  const W = 640, H = 240, pad = { l: 8, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.omzet)) * 1.08;
  const slot = (W - pad.l - pad.r) / Math.max(1, data.length);
  const bw = Math.min(34, slot / 2.6);
  const h = (v: number) => (Math.max(0, v) / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Omzet dan bersih per bulan" className="w-full">
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--ink)" />
      {data.map((d, i) => {
        const cx = pad.l + slot * i + slot / 2;
        return (
          <g key={d.label}>
            <rect x={cx - bw - 1} y={H - pad.b - h(d.omzet)} width={bw} height={h(d.omzet)} fill="var(--ink)">
              <title>{`Omzet ${d.label}: Rp${num(d.omzet)}`}</title>
            </rect>
            <rect x={cx + 1} y={H - pad.b - h(d.bersih)} width={bw} height={h(d.bersih)} fill="var(--chestnut)">
              <title>{`Bersih ${d.label}: Rp${num(d.bersih)}`}</title>
            </rect>
            <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.label}</text>
            <text x={cx - bw / 2 - 1} y={H - pad.b - h(d.omzet) - 4} textAnchor="middle" fontSize="10" fill="var(--ink)">{num(d.omzet / 1000000)}jt</text>
          </g>
        );
      })}
    </svg>
  );
}
