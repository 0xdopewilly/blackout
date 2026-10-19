import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerdictBadge } from "@/components/ledger-card";
import { DayStrip, SignalChart } from "@/components/signal-chart";
import { EXPLORER } from "@/lib/config";
import { loadBook, txsFor } from "@/lib/data";
import { DAYS, FLAGS, VERDICT, day, gen, short, weekLabel } from "@/lib/format";
import { loadHeadlines } from "@/lib/news";
import { loadSignal } from "@/lib/signal";

export const revalidate = 30;

type Params = { entity: string; ws: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { entity, ws } = await params;
  return { title: `${entity.replace("country-", "")} · week of ${weekLabel(Number(ws))}` };
}

export default async function WeekPage({ params }: { params: Promise<Params> }) {
  const { entity: slug, ws: wsText } = await params;
  const entity = slug.replace("-", "/");
  const ws = Number(wsText);
  const book = await loadBook();
  const obs = book.ledger.find((o) => o.entity === entity && o.week_start === ws);
  const terms = book.terms.find((t) => t.entity === entity);
  if (!obs || !terms) notFound();
  const [signal, headlines] = await Promise.all([
    loadSignal(entity, ws, terms.tz_min),
    obs.cls === "NO_SHUTDOWN_SIGNAL" ? Promise.resolve([]) : loadHeadlines(obs.country, ws),
  ]);
  const policies = book.policies.filter((p) => p.entity === entity && p.week_start === ws);
  const txs = txsFor(entity, ws);
  const verdict = VERDICT[obs.cls];
  const lostNames = DAYS.filter((_, d) => obs.mask & (1 << d));
  const tz = `UTC${terms.tz_min >= 0 ? "+" : "−"}${Math.floor(Math.abs(terms.tz_min) / 60)}${Math.abs(terms.tz_min) % 60 ? ":" + String(Math.abs(terms.tz_min) % 60).padStart(2, "0") : ""}`;

  return (
    <main className="wrap page">
      <div className="crumbs">
        <Link href="/#ledger">Ledger</Link> / {obs.country}
      </div>
      <div className="week-head">
        <div>
          <h1>
            {FLAGS[entity] ?? ""} {obs.country}
            <br />
            <span className="muted">week of {weekLabel(ws)}</span>
          </h1>
        </div>
        <div className="verdict-big">
          <VerdictBadge cls={obs.cls} />
          <span className="badges">
            {obs.replay && <span className="badge replay">Replay of a past week</span>}
            <span className="badge replay">attempt {obs.attempts}{obs.final ? ", final" : ", observed again later"}</span>
          </span>
        </div>
      </div>
      <p className="lede muted" style={{ fontSize: 18, maxWidth: 760, marginTop: 0 }}>{verdict.sentence(obs.lost)}</p>

      <div className="panel">
        <h2>
          What the validators measured <small>IODA, local time {tz}</small>
        </h2>
        <SignalChart signal={signal} mask={obs.mask} darkH={obs.dark_h} />
        <div className="legend">
          <span><i style={{ background: "var(--green)" }} />Routing (BGP), % of normal</span>
          <span><i style={{ background: "var(--cyan)" }} />Active probing, % of normal</span>
          <span><i style={{ background: "var(--amber)" }} />50%: below it an hour is dark</span>
          <span><i style={{ background: "var(--red)", opacity: 0.6 }} />Lost day: six or more dark hours</span>
        </div>
        <p className="small faint" style={{ marginBottom: 0 }}>
          Normal is each series&apos; upper quartile over the seven days before the week. The contract stores the result every validator had to
          reproduce exactly: {obs.lost} lost day{obs.lost === 1 ? "" : "s"}{lostNames.length ? ` (${lostNames.join(", ")})` : ""}, mask {obs.mask}.
          The chart is drawn from the same IODA window for illustration.
        </p>
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>
            What they read <small>{obs.cls === "NO_SHUTDOWN_SIGNAL" ? "no model call" : "this week's allowlisted headlines"}</small>
          </h2>
          {obs.cls === "NO_SHUTDOWN_SIGNAL" ? (
            <p className="muted" style={{ margin: 0 }}>
              With no lost day, the contract decides by measurement alone: no news is fetched and no model is asked, so no headline can ever
              pay a policy on its own.
            </p>
          ) : headlines.length ? (
            <>
              <ul className="headlines">
                {headlines.map((h) => (
                  <li key={h.title}>
                    <span>{h.domain}</span>
                    {h.title}
                  </li>
                ))}
              </ul>
              <p className="small faint" style={{ marginBottom: 0 }}>
                Fetched by this website with the validators&apos; own query and outlet allowlist. Each validator fetched and judged its own copy;
                the contract stores only the verdict they all reached, never a leader&apos;s headlines or notes.
              </p>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>The headlines could not be loaded right now. The verdict above is the contract&apos;s.</p>
          )}
        </div>
        <div>
          <div className="panel">
            <h2>Settlement</h2>
            <dl className="kv">
              <dt>Verdict</dt><dd>{verdict.label}</dd>
              <dt>Lost days</dt><dd>{obs.lost} of 7</dd>
              <dt>Policies</dt><dd>{obs.policies} ({obs.settled} settled)</dd>
              <dt>Observed</dt><dd>{obs.observed_at ? day(obs.observed_at) : "–"}</dd>
            </dl>
            <DayStrip mask={obs.mask} darkH={obs.dark_h} />
            {policies.length > 0 && (
              <div className="scroll-x" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead><tr><th>Policy</th><th>Beneficiary</th><th>Status</th><th>Paid</th></tr></thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p.pid}>
                        <td className="mono">{p.pid}</td>
                        <td className="mono">{short(p.beneficiary)}</td>
                        <td><span className={`badge ${p.status.toLowerCase()}`}>{p.status}</span></td>
                        <td>{gen(p.paid)} GEN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {txs.length > 0 && (
            <div className="panel">
              <h2>On chain</h2>
              <ul className="txs">
                {txs.map((t) => (
                  <li key={t.hash}>
                    {t.label}
                    <br />
                    <a href={`${EXPLORER}/tx/${t.hash}`} target="_blank" rel="noreferrer">{t.hash.slice(0, 18)}… ↗</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
