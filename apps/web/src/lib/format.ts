import type { Verdict } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "1.25" from wei, at most 3 decimals, no trailing zeros. */
export function gen(wei: string | bigint | number): string {
  const value = BigInt(wei || 0);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, 3).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

export function day(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "15–21 Jul 2024" for a week starting at week_start (Monday 00:00 UTC). */
export function weekLabel(ws: number): string {
  const a = new Date(ws * 1000), b = new Date((ws + 6 * 86400) * 1000);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return sameMonth
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function short(address: string): string {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

export const FLAGS: Record<string, string> = {
  "country/BD": "🇧🇩", "country/GH": "🇬🇭", "country/PK": "🇵🇰", "country/IR": "🇮🇷", "country/IQ": "🇮🇶",
  "country/ET": "🇪🇹", "country/MM": "🇲🇲",
};

export const VERDICT: Record<Verdict, { label: string; tone: string; sentence: (lost: number) => string }> = {
  GOVERNMENT_ORDERED: {
    label: "Government ordered",
    tone: "gov",
    sentence: (lost) => `Validators ruled the shutdown was ordered by the authorities. Policies pay ${lost} lost day${lost === 1 ? "" : "s"}.`,
  },
  NON_GOVERNMENT_CAUSE: {
    label: "Not the government",
    tone: "nongov",
    sentence: (lost) => `Connectivity collapsed for ${lost} day${lost === 1 ? "" : "s"}, but validators found another cause. Political cover pays nothing.`,
  },
  UNATTRIBUTED: {
    label: "Undecided",
    tone: "unattr",
    sentence: () => "The reporting was too thin to decide. The week is observed again later; nothing is paid yet.",
  },
  NO_SHUTDOWN_SIGNAL: {
    label: "No shutdown",
    tone: "nosig",
    sentence: () => "No day lost six or more hours of connectivity. Decided by measurement alone, with no model call.",
  },
};

/** The next Mondays (00:00 UTC) that can still be bought: at least 72 hours away. */
export function buyableWeeks(nowS: number, count = 6): number[] {
  const MONDAY = 4 * 86400, WEEK = 7 * 86400;
  let ws = nowS + ((MONDAY - nowS) % WEEK + WEEK) % WEEK;
  const out: number[] = [];
  while (out.length < count) {
    if (ws >= nowS + 72 * 3600) out.push(ws);
    ws += WEEK;
  }
  return out;
}
