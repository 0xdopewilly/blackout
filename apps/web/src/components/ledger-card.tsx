import Link from "next/link";
import { DayStrip } from "@/components/signal-chart";
import { FLAGS, VERDICT, weekLabel } from "@/lib/format";
import type { Observation } from "@/lib/types";

export function VerdictBadge({ cls }: { cls: Observation["cls"] }) {
  const v = VERDICT[cls];
  return <span className={`badge ${v.tone}`}>{v.label}</span>;
}

export function LedgerCard({ obs }: { obs: Observation }) {
  const href = `/week/${obs.entity.replace("/", "-")}/${obs.week_start}`;
  return (
    <Link href={href} className="card">
      <div className="card-top">
        <div>
          <div className="card-title">
            {FLAGS[obs.entity] ?? ""} {obs.country}
          </div>
          <div className="card-sub">Week of {weekLabel(obs.week_start)}</div>
        </div>
        <div className="badges">
          <VerdictBadge cls={obs.cls} />
        </div>
      </div>
      <DayStrip mask={obs.mask} darkH={obs.dark_h} />
      <div className="card-foot">
        <span>
          {obs.lost} lost day{obs.lost === 1 ? "" : "s"}
          {obs.n_src ? ` · ${obs.n_src} headlines read` : " · no model call"}
        </span>
        <span className="badges">
          {obs.replay && <span className="badge replay">Replay</span>}
          {obs.policies > 0 && <span className="badge live">{obs.policies} polic{obs.policies === 1 ? "y" : "ies"}</span>}
        </span>
      </div>
    </Link>
  );
}
