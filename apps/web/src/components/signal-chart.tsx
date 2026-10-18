import { DAYS } from "@/lib/format";
import type { WeekSignal } from "@/lib/signal";

// The covered week, hour by hour: BGP routing and active probing as a share of normal, the 50%
// line that makes an hour dark, and the lost days (six or more dark hours) shaded.
export function SignalChart({ signal, mask, darkH, compact = false }: { signal: WeekSignal; mask: number; darkH: number[]; compact?: boolean }) {
  const W = 1000, H = compact ? 200 : 280, top = 16, bottom = compact ? 26 : 34, left = compact ? 6 : 44, right = 6;
  const plotW = W - left - right, plotH = H - top - bottom;
  const x = (h: number) => left + (h / 168) * plotW;
  const y = (pct: number) => top + plotH - (Math.min(pct, 125) / 125) * plotH;
  const path = (values: (number | null)[]) => {
    let d = "", pen = false;
    values.forEach((v, h) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(h + 0.5).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  return (
    <svg className={`chart${compact ? " compact" : ""}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Connectivity through the covered week as a share of normal">
      {DAYS.map((name, d) => (
        <g key={name}>
          {mask & (1 << d) ? <rect className="lost" x={x(d * 24)} y={top} width={plotW / 7} height={plotH} /> : null}
          <line className="dayline" x1={x(d * 24)} x2={x(d * 24)} y1={top} y2={top + plotH} />
          <text className="daylabel" x={x(d * 24 + 12)} y={H - (compact ? 8 : 12)} textAnchor="middle">
            {name}{!compact && darkH[d] ? ` · ${darkH[d]}h dark` : ""}
          </text>
        </g>
      ))}
      {!compact && [0, 50, 100].map((p) => (
        <text key={p} className="axis" x={left - 8} y={y(p) + 4} textAnchor="end">{p}%</text>
      ))}
      <line className="threshold" x1={left} x2={W - right} y1={y(50)} y2={y(50)} />
      <path className="series ping" d={path(signal.ping)} />
      <path className="series bgp" d={path(signal.bgp)} />
      {!signal.ok && <text className="axis" x={W / 2} y={H / 2} textAnchor="middle">IODA could not be reached for the chart; the verdict above is the contract&apos;s.</text>}
    </svg>
  );
}

export function DayStrip({ mask, darkH }: { mask: number; darkH: number[] }) {
  return (
    <div className="daystrip" aria-label="Dark hours per local day">
      {DAYS.map((name, d) => (
        <span key={name} className={mask & (1 << d) ? "lostday" : darkH[d] ? "dim" : ""} title={`${name}: ${darkH[d] ?? 0} dark hours`}>
          <b>{name[0]}</b>
          <i style={{ height: `${Math.min(100, ((darkH[d] ?? 0) / 24) * 100)}%` }} />
        </span>
      ))}
    </div>
  );
}
