// Hourly connectivity for one covered week, from the same IODA window the contract measures
// (lib/outage_signal.py): each series as a percentage of its upper-quartile baseline over the seven
// days before the local week. Used only to draw the chart; payouts come from the contract.
import { unstable_cache } from "next/cache";

const DAY = 86400;
const WEEK = 7 * DAY;

export interface WeekSignal {
  bgp: (number | null)[];
  ping: (number | null)[];
  ok: boolean;
}

type Series = { datasource: string; from: number; step: number; values: (number | null)[] };

function percentile(values: number[], pct: number): number {
  const xs = [...values].sort((a, b) => a - b);
  return xs.length ? xs[Math.floor((xs.length * pct) / 100)] : 0;
}

function hourly(series: Series | undefined, localStart: number): (number | null)[] {
  const out: (number | null)[] = Array(168).fill(null);
  if (!series || !series.step) return out;
  const base = percentile(
    series.values.filter((v, i): v is number => v !== null && series.from + i * series.step >= localStart - WEEK && series.from + i * series.step < localStart),
    75,
  );
  if (base <= 0) return out;
  series.values.forEach((v, i) => {
    if (v === null) return;
    const t = series.from + i * series.step - localStart;
    if (t < 0 || t >= WEEK) return;
    const h = Math.floor(t / 3600);
    const pct = Math.min(130, (v * 100) / base);
    out[h] = out[h] === null ? pct : Math.min(out[h] as number, pct);
  });
  return out;
}

async function fetchSignal(entity: string, weekStart: number, tzMin: number): Promise<WeekSignal> {
  const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/${entity}?from=${weekStart - 8 * DAY}&until=${weekStart + 8 * DAY}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`IODA ${response.status}`);
  const payload = (await response.json()) as { data?: Series[][] };
  const rows = payload.data?.[0] ?? [];
  const by = Object.fromEntries(rows.map((s) => [s.datasource, s]));
  const localStart = weekStart - tzMin * 60;
  return { bgp: hourly(by["bgp"], localStart), ping: hourly(by["ping-slash24"], localStart), ok: true };
}

export function loadSignal(entity: string, weekStart: number, tzMin: number): Promise<WeekSignal> {
  return unstable_cache(
    () => fetchSignal(entity, weekStart, tzMin),
    ["ioda-week", entity, String(weekStart), String(tzMin)],
    { revalidate: 86400 },
  )().catch(() => ({ bgp: Array(168).fill(null), ping: Array(168).fill(null), ok: false }));
}
