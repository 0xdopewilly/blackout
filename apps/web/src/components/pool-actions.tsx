"use client";

import { useEffect, useState } from "react";
import { sendWrite, toWei } from "@/lib/client";
import { gen } from "@/lib/format";
import { TxLine, useTx } from "./use-tx";
import { useWallet } from "./wallet";

type Lp = { shares: string; value: string; withdrawal: { shares: string; ready_at: number } | null };

export function PoolActions({ noticeDays }: { noticeDays: number }) {
  const wallet = useWallet();
  const [amount, setAmount] = useState("10");
  const [lp, setLp] = useState<Lp | null>(null);
  const tx = useTx();

  useEffect(() => {
    if (!wallet.address) return;
    fetch(`/api/read?m=get_lp&a=${encodeURIComponent(JSON.stringify([wallet.address]))}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((v: Lp) => setLp(v))
      .catch(() => setLp(null));
  }, [wallet.address, tx.state.phase]);

  const busy = tx.state.phase === "signing" || tx.state.phase === "pending";
  const ready = lp?.withdrawal && lp.withdrawal.ready_at * 1000 <= Date.now();
  return (
    <div className="panel form">
      <h2 style={{ marginBottom: 0 }}>Provide liquidity</h2>
      {!wallet.address ? (
        <div className="status">Connect a wallet to add liquidity or see your shares.</div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="amount">Amount (GEN)</label>
            <input id="amount" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <button className="btn primary" type="button" disabled={busy || !(Number(amount) > 0)} onClick={() => tx.run(() => sendWrite(wallet.signer!, "add_liquidity", [], toWei(amount)))}>
            Add {amount || 0} GEN
          </button>
          {lp && lp.shares !== "0" && (
            <div className="quote">
              <div className="row"><span className="muted">Your shares are worth</span><b>{gen(lp.value)} GEN</b></div>
              {lp.withdrawal ? (
                <div className="small faint">
                  Withdrawal requested; {ready ? "ready now." : `ready ${new Date(lp.withdrawal.ready_at * 1000).toUTCString()}.`}
                </div>
              ) : null}
              <div className="actions">
                <button className="btn small" type="button" disabled={busy} onClick={() => tx.run(() => sendWrite(wallet.signer!, "request_withdraw", [lp.shares]))}>
                  Give {noticeDays}-day notice
                </button>
                <button className="btn small" type="button" disabled={busy || !ready} onClick={() => tx.run(() => sendWrite(wallet.signer!, "execute_withdraw", []))}>
                  Withdraw after notice
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <TxLine state={tx.state} done="Done." />
    </div>
  );
}
