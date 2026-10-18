"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sendWrite } from "@/lib/client";
import { FLAGS, buyableWeeks, gen, weekLabel } from "@/lib/format";
import type { Terms } from "@/lib/types";
import { TxLine, useTx } from "./use-tx";
import { useWallet } from "./wallet";

type Quote = { refusal: string; premium: string; cover: string; loading_pct: number; replay: boolean };

export function CoverForm({ terms }: { terms: Terms[] }) {
  const wallet = useWallet();
  const [entity, setEntity] = useState(terms[0]?.entity ?? "");
  const weeks = useMemo(() => buyableWeeks(Math.floor(Date.now() / 1000)), []);
  const [week, setWeek] = useState(weeks[0]);
  const [payOther, setPayOther] = useState(false);
  const [other, setOther] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const tx = useTx();
  const t = terms.find((x) => x.entity === entity);
  const beneficiary = payOther ? other.trim() : "";
  const validOther = !payOther || /^0x[0-9a-fA-F]{40}$/.test(beneficiary);

  useEffect(() => {
    if (!entity || !week) return;
    setQuote(null);
    const buyer = wallet.address || "0x0000000000000000000000000000000000000000";
    fetch(`/api/read?m=quote&a=${encodeURIComponent(JSON.stringify([entity, week, buyer]))}`)
      .then((r) => r.json())
      .then((q: Quote & { error?: string }) => setQuote(q.error ? null : q))
      .catch(() => setQuote(null));
  }, [entity, week, wallet.address, tx.state.phase]);

  async function buy() {
    if (!wallet.signer || !quote) return;
    await tx.run(() => sendWrite(wallet.signer!, "buy_cover", [entity, week, beneficiary], BigInt(quote.premium)));
  }

  const returned = tx.state.info?.returned?.value as { ok?: boolean; pid?: string; error?: string } | undefined;
  if (!terms.length) return <div className="empty">Cover terms could not be read from the contract. Try again in a moment.</div>;

  return (
    <div className="cover-grid">
      <div className="panel form">
        <div className="field">
          <label htmlFor="country">Country</label>
          <select id="country" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {terms.map((x) => (
              <option key={x.entity} value={x.entity}>{FLAGS[x.entity] ?? ""} {x.country}</option>
            ))}
          </select>
          {t && <div className="hint">Pays {gen(t.daily)} GEN per lost day, up to {t.cap_days} days a week. Days are counted in local time.</div>}
        </div>
        <div className="field">
          <label>Week</label>
          <div className="chips">
            {weeks.map((ws) => (
              <button key={ws} type="button" aria-pressed={ws === week} onClick={() => setWeek(ws)}>{weekLabel(ws)}</button>
            ))}
          </div>
          <div className="hint">Cover is sold at least 72 hours before the week starts, so nobody buys once a shutdown has begun.</div>
        </div>
        <div className="field">
          <label>Who gets paid</label>
          <div className="chips">
            <button type="button" aria-pressed={!payOther} onClick={() => setPayOther(false)}>Me</button>
            <button type="button" aria-pressed={payOther} onClick={() => setPayOther(true)}>Someone else</button>
          </div>
          {payOther && (
            <>
              <input type="text" placeholder="0x… address of the person to pay" value={other} onChange={(e) => setOther(e.target.value)} style={{ marginTop: 10 }} />
              <div className="hint">During a shutdown the covered person may not be able to transact. Pay a family member abroad, who can.</div>
            </>
          )}
        </div>
      </div>

      <div className="panel form">
        <div className="quote">
          <div className="row"><span className="muted">Premium</span><b>{quote ? `${gen(quote.premium)} GEN` : "…"}</b></div>
          <div className="row"><span className="muted">Maximum payout</span><b>{quote ? `${gen(quote.cover)} GEN` : "…"}</b></div>
          {quote && quote.loading_pct > 100 && (
            <div className="small faint">Includes +{quote.loading_pct - 100}% for this country&apos;s recorded government-ordered shutdown days.</div>
          )}
          {quote?.refusal && <div className="small" style={{ color: "#ffc2c8" }}>{quote.refusal}</div>}
        </div>
        {!wallet.address ? (
          <div className="status">Connect a wallet (top right) to buy. The test wallet needs no install and the Studio faucet funds it.</div>
        ) : (
          <button className="btn red" type="button" disabled={!quote || !!quote.refusal || !validOther || tx.state.phase === "signing" || tx.state.phase === "pending"} onClick={buy}>
            Buy cover for {weekLabel(week)}
          </button>
        )}
        <TxLine
          state={tx.state}
          done={returned?.ok ? <>Policy <b>{returned.pid}</b> bought. <Link className="link" href="/policies">See your policies</Link>.</> : `Refused and refunded: ${returned?.error ?? "unknown reason"}.`}
        />
        <p className="small faint" style={{ margin: 0 }}>
          Test network: premiums and payouts are test GEN. A refused purchase is refunded in full and can be withdrawn from My policies.
        </p>
      </div>
    </div>
  );
}
