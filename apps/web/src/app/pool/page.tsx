import type { Metadata } from "next";
import { PoolActions } from "@/components/pool-actions";
import { loadBook } from "@/lib/data";
import { gen } from "@/lib/format";

export const metadata: Metadata = { title: "Pool" };
export const revalidate = 30;

export default async function PoolPage() {
  const book = await loadBook();
  const pool = book.pool;
  const notice = book.config ? Math.round(book.config.withdraw_notice_s / 86400) : 14;
  const acct = book.accounting;
  return (
    <main className="wrap page">
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 46px)" }}>The pool</h1>
          <p>
            Liquidity providers fund payouts and earn every premium. Each active policy reserves its maximum payout, which cannot be withdrawn;
            withdrawals wait {notice} days, so nobody can run when a shutdown starts.
          </p>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><span>Pool</span><b>{pool ? gen(pool.pool) : "–"}<small>GEN</small></b></div>
        <div className="stat"><span>Reserved for active cover</span><b>{pool ? gen(pool.reserved) : "–"}<small>GEN</small></b></div>
        <div className="stat"><span>Free capital</span><b>{pool ? gen(pool.free) : "–"}<small>GEN</small></b></div>
        <div className="stat"><span>Share value</span><b>{pool ? gen(pool.share_price_wei_e18) : "–"}<small>GEN</small></b></div>
      </div>
      <div className="grid2">
        <PoolActions noticeDays={notice} />
        <div className="panel">
          <h2>Limits that protect the pool</h2>
          <dl className="kv">
            <dt>Per country-week</dt><dd>at most 20% of the pool in cover</dd>
            <dt>All policies</dt><dd>at most 80% of the pool reserved</dd>
            <dt>Per wallet</dt><dd>5 policies per country-week</dd>
            <dt>Sales close</dt><dd>72 hours before the week starts</dd>
            <dt>Pricing</dt><dd>+5% per recorded government-ordered lost day, up to +100%</dd>
          </dl>
          {acct && (
            <p className="small faint" style={{ marginBottom: 0 }}>
              Conservation check from the contract: balance {gen(String(acct.balance))} GEN = pool {gen(String(acct.pool))} + owed{" "}
              {gen(String(acct.claimable_total))}. {acct.conserved ? "Holds." : "Does not hold."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
