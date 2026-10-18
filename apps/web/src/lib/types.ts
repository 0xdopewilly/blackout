export type Verdict = "GOVERNMENT_ORDERED" | "NON_GOVERNMENT_CAUSE" | "UNATTRIBUTED" | "NO_SHUTDOWN_SIGNAL";

export interface Terms {
  entity: string;
  country: string;
  tz_min: number;
  daily: string;
  rate_bps: number;
  cap_days: number;
  history_days: number;
}

export interface Headline {
  title: string;
  domain: string;
}

export interface Observation {
  entity: string;
  country: string;
  week_start: number;
  cls: Verdict;
  mask: number;
  lost: number;
  dark_h: number[];
  n_src: number;
  digest: string;
  why: string;
  evidence: Headline[];
  attempts: number;
  observed_at: number;
  final: boolean;
  settled: number;
  replay: boolean;
  policies: number;
}

export interface Policy {
  pid: string;
  holder: string;
  beneficiary: string;
  entity: string;
  week_start: number;
  premium: string;
  daily: string;
  cap_days: number;
  cover: string;
  status: "ACTIVE" | "PAID" | "EXPIRED";
  paid: string;
  replay: boolean;
  bought_at: number;
}

export interface Pool {
  pool: string;
  reserved: string;
  free: string;
  total_shares: string;
  share_price_wei_e18: string;
  lps: number;
  policies: number;
  observations: number;
}

export interface Config {
  version: string;
  owner: string;
  demo_mode: boolean;
  withdraw_notice_s: number;
  lead_s: number;
  settle_delay_s: number;
  reobserve_gap_s: number;
  max_attempts: number;
  wallet_cap: number;
  entity_cap_bps: number;
  total_cap_bps: number;
  dark_pct: number;
  lost_hours: number;
  baseline_percentile: number;
  outlets: number;
}

export interface TxRef {
  label: string;
  hash: string;
}

export interface Book {
  live: boolean;
  as_of: string;
  contract: string;
  config: Config | null;
  terms: Terms[];
  ledger: Observation[];
  pool: Pool | null;
  policies: Policy[];
  accounting: Record<string, string | boolean> | null;
}
