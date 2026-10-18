"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sendWrite } from "@/lib/client";
import { FLAGS, gen, short, weekLabel } from "@/lib/format";
import type { Policy } from "@/lib/types";
import { TxLine, useTx } from "./use-tx";
import { useWallet } from "./wallet";

async function read<T>(m: string, a: (string | number)[]): Promise<T> {
  const r = await fetch(`/api/read?m=${m}&a=${encodeURIComponent(JSON.stringify(a))}`, { cache: "no-store" });
  if (!r.ok) throw new Error("read failed");
  return (await r.json()) as T;
}

export function MyPolicies() {
  const wallet = useWallet();
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [claimable, setClaimable] = useState("0");
  const tx = useTx();

  useEffect(() => {
    if (!wallet.address) return;
    setPolicies(null);
    read<Policy[]>("policies_of", [wallet.address]).then(setPolicies).catch(() => setPolicies([]));
    read<number | string>("get_claimable", [wallet.address]).then((v) => setClaimable(String(v))).catch(() => setClaimable("0"));
  }, [wallet.address, tx.state.phase]);

  if (!wallet.address) return <div className="empty">Connect a wallet (top right) to see your policies.</div>;
  return (
    <>
      <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="faint small">Ready to withdraw (payouts and refunds)</div>
          <div style={{ font: "600 28px var(--font-display)" }}>{gen(claimable)} GEN</div>
        </div>
        <button className="btn primary" type="button" disabled={claimable === "0" || tx.state.phase === "pending"} onClick={() => tx.run(() => sendWrite(wallet.signer!, "withdraw", []))}>
          Withdraw
        </button>
      </div>
      <TxLine state={tx.state} done="Sent to your wallet." />
      {policies === null ? (
        <div className="empty">Reading your policies…</div>
      ) : policies.length === 0 ? (
        <div className="empty">No policies yet. <Link className="link" href="/cover">Cover an upcoming week</Link>.</div>
      ) : (
        <div className="panel scroll-x">
          <table className="table">
            <thead><tr><th>Policy</th><th>Country and week</th><th>Beneficiary</th><th>Premium</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>
              {[...policies].reverse().map((p) => (
                <tr key={p.pid}>
                  <td className="mono">{p.pid}</td>
                  <td>{FLAGS[p.entity] ?? ""} {p.entity.replace("country/", "")} · {weekLabel(p.week_start)} {p.replay && <span className="badge replay">Replay</span>}</td>
                  <td className="mono">{p.beneficiary === wallet.address ? "you" : short(p.beneficiary)}</td>
                  <td>{gen(p.premium)} GEN</td>
                  <td><span className={`badge ${p.status.toLowerCase()}`}>{p.status === "ACTIVE" ? "Covered" : p.status === "PAID" ? "Paid" : "Expired"}</span></td>
                  <td>{gen(p.paid)} GEN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
