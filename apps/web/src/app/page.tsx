import Link from "next/link";
import { LedgerCard, VerdictBadge } from "@/components/ledger-card";
import { SignalChart } from "@/components/signal-chart";
import { loadBook } from "@/lib/data";
import { gen, weekLabel } from "@/lib/format";
import { loadSignal } from "@/lib/signal";

export const revalidate = 30;

export default async function Home() {
  const book = await loadBook();
  const paid = book.policies.reduce((sum, p) => sum + BigInt(p.paid), 0n);
  const ledger = [...book.ledger].sort((a, b) => b.week_start - a.week_start || a.entity.localeCompare(b.entity));
  // the first government-ordered week observed: the moment connectivity collapses
  const showcase = [...book.ledger].reverse().find((o) => o.cls === "GOVERNMENT_ORDERED") ?? book.ledger[0];
  const terms = showcase ? book.terms.find((t) => t.entity === showcase.entity) : undefined;
  const signal = showcase && terms ? await loadSignal(showcase.entity, showcase.week_start, terms.tz_min) : null;

  return (
    <main>
      <div className="wrap hero">
        <div className="hero-grid">
          <div>
            <span className="kicker">
              <span className="dot on" /> Live on GenLayer Studio Next
            </span>
            <h1>
              When a government cuts the internet, <em>BLACKOUT pays.</em>
            </h1>
            <p className="lede">
              Weekly cover for freelancers, remote workers and their families. GenLayer validators measure the outage from IODA&apos;s
              internet signals and read the world&apos;s reporting to decide what nobody else can rule on neutrally: did the authorities do
              this? Government-ordered lost days pay automatically, to anyone you choose. No claim to file.
            </p>
            <div className="actions">
              <Link className="btn primary" href="/cover">Buy cover</Link>
              <Link className="btn" href="/how">How it decides</Link>
            </div>
          </div>
          {showcase && signal && (
            <Link href={`/week/${showcase.entity.replace("/", "-")}/${showcase.week_start}`} className="hero-card">
              <div className="hero-card-head">
                <b>{showcase.country} · {weekLabel(showcase.week_start)}</b>
                <VerdictBadge cls={showcase.cls} />
              </div>
              <SignalChart signal={signal} mask={showcase.mask} darkH={showcase.dark_h} compact />
              <div className="legend">
                <span><i style={{ background: "var(--green)" }} />Routing (BGP)</span>
                <span><i style={{ background: "var(--cyan)" }} />Active probing</span>
                <span><i style={{ background: "var(--red)", opacity: 0.6 }} />Lost day</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="wrap">
        {!book.live && (
          <div className="notice">
            Contract reads are unavailable right now{book.as_of ? `; showing a stored snapshot from ${book.as_of.slice(0, 16).replace("T", " ")} UTC` : ""}.
            It is not current state.
          </div>
        )}
        <div className="stats">
          <div className="stat"><span>Pool</span><b>{book.pool ? gen(book.pool.pool) : "–"}<small>GEN</small></b></div>
          <div className="stat"><span>Policies sold</span><b>{book.policies.length}</b></div>
          <div className="stat"><span>Weeks decided</span><b>{book.ledger.filter((o) => o.final).length}</b></div>
          <div className="stat"><span>Paid to beneficiaries</span><b>{gen(paid)}<small>GEN</small></b></div>
        </div>

        <section>
          <div className="section-head">
            <div>
              <h2>How a week is decided</h2>
              <p>One transaction, five validators, no claim. Each step is something a single oracle could not be trusted with.</p>
            </div>
          </div>
          <div className="steps3">
            <div className="step3">
              <span className="n">01 · MEASURE</span>
              <h3>Every validator measures the outage</h3>
              <p>Each fetches the same historical IODA window and counts local days with six or more dark hours. Integer maths, so all of them must match exactly.</p>
              <span className="tag">exact agreement</span>
            </div>
            <div className="step3">
              <span className="n">02 · ATTRIBUTE</span>
              <h3>Then judges who caused it</h3>
              <p>Each reads that week&apos;s headlines from allowlisted outlets with its own model: government order, other cause, or not enough to say. A leader can defer a payout, never invent one.</p>
              <span className="tag">asymmetric agreement</span>
            </div>
            <div className="step3">
              <span className="n">03 · SETTLE</span>
              <h3>Policies pay themselves</h3>
              <p>A government-ordered shutdown pays one daily amount per lost day to each policy&apos;s beneficiary, who can be family abroad. A cable cut or a quiet week pays nothing.</p>
              <span className="tag">no claim filed</span>
            </div>
          </div>
        </section>

        <section id="ledger">
          <div className="section-head">
            <div>
              <h2>The shutdown ledger</h2>
              <p>Every week the validators have decided, with the evidence they read. A public record no government can edit.</p>
            </div>
            <Link className="btn small" href="/cover">Cover an upcoming week</Link>
          </div>
          {book.ledger.length ? (
            <div className="ledger">{ledger.map((obs) => <LedgerCard key={`${obs.entity}${obs.week_start}`} obs={obs} />)}</div>
          ) : (
            <div className="empty">No week has been observed yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
