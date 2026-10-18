import type { Metadata } from "next";
import Link from "next/link";
import { CONTRACT, EXPLORER, REPO } from "@/lib/config";

export const metadata: Metadata = { title: "How it works" };

export default function HowPage() {
  return (
    <main className="wrap page prose">
      <h1 style={{ fontSize: "clamp(32px, 4.4vw, 46px)" }}>How BLACKOUT decides</h1>
      <p>
        Governments order hundreds of internet shutdowns a year. In July 2024 Bangladesh cut a country of 170 million off for days and froze
        the income of one of the world&apos;s largest freelancer workforces. Insurers exclude political risk, and no single oracle can be trusted
        to say a government did it while that government denies it. BLACKOUT has GenLayer validators decide, one week at a time.
      </p>

      <h2>1. Measure: an exact signal</h2>
      <p>
        After a covered week, anyone calls <code>observe</code>. Every validator fetches the same historical window from{" "}
        <a href="https://ioda.inetintel.cc.gatech.edu" target="_blank" rel="noreferrer">IODA</a> (Georgia Tech&apos;s internet outage
        detection) and computes, in integer arithmetic, how many local days had at least six hours below half of normal connectivity, in
        either BGP routing or active probing. Normal is the upper quartile of the previous seven days. Because the data is historical and the
        maths has no floats, every validator must get the identical lost-day mask, or the transaction fails.
      </p>
      <p>
        Six hours is deliberate: Iraq&apos;s one-to-two-hour exam-season cuts, which are scheduled and predictable, never count. A week with no
        lost day is decided as <strong>No shutdown</strong> right there, with no news fetched and no model asked.
      </p>

      <h2>2. Attribute: a judgment no oracle can make</h2>
      <p>
        A collapse in connectivity does not say who caused it. Ghana&apos;s March 2024 subsea cable cuts look almost exactly like Bangladesh&apos;s
        shutdown in the data. So each validator fetches that week&apos;s news from Google News, keeps only headlines from about 95 allowlisted
        newsrooms and digital-rights monitors (checked in code before any model sees them), strips invisible characters, fences them, and asks
        its own model one question with three possible answers: <strong>government ordered</strong>, <strong>not the government</strong>, or{" "}
        <strong>undecided</strong>.
      </p>
      <p>
        The answers are compared asymmetrically. Validators must agree on the class, except that a leader may say <em>undecided</em> where a
        validator saw another cause: both mean no payout now. So a leader can defer a payout but can never invent one, and can never bury a
        government-ordered shutdown. An undecided week is observed again after six hours, up to three times.
      </p>

      <h2>3. Settle: no claim to file</h2>
      <p>
        Once a week is decided, anyone calls <code>settle</code>. Each policy for a government-ordered week pays the daily amount for every lost
        day, up to its cap, to its beneficiary: the buyer or anyone they chose, such as family abroad who can still transact while the covered
        person cannot. A keeper can push the payout to the beneficiary&apos;s wallet. Every other verdict expires the policy and its premium stays
        with the pool.
      </p>

      <h2>Rules against gaming it</h2>
      <ul>
        <li><strong>No buying into a fire:</strong> cover is sold at least 72 hours before the week starts.</li>
        <li><strong>No grinding the judge:</strong> one stored observation per week; only an undecided one is retried, on a fixed schedule.</li>
        <li><strong>No injected verdicts:</strong> no caller text reaches the model, only allowlisted headlines, and a payout also needs the exact signal.</li>
        <li><strong>No bank run:</strong> active cover is reserved and cannot leave; LP withdrawals wait 14 days.</li>
        <li><strong>No concentration:</strong> one country-week takes at most 20% of the pool, all cover at most 80%, five policies per wallet per week.</li>
        <li><strong>Priced by history:</strong> each recorded government-ordered lost day raises that country&apos;s premium by 5%, up to double.</li>
      </ul>

      <h2>What it does not do yet</h2>
      <ul>
        <li>Mobile-only and regional shutdowns barely show in national IODA data (Pakistan, February 2024). A separate order-evidence track is planned.</li>
        <li>Verdicts can be appealed through GenLayer&apos;s own appeals; an in-app challenge with a bond is planned.</li>
        <li>This is a test network deployment with test GEN. Past weeks marked Replay were opened by the deployer so the whole flow can run on real events; live weeks follow every rule above.</li>
      </ul>

      <p>
        Source, tests and evidence: <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>. Contract:{" "}
        <a href={`${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer">{CONTRACT}</a>. <Link href="/cover">Buy cover</Link>.
      </p>
    </main>
  );
}
