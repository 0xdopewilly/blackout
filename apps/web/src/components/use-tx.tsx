"use client";

import { useCallback, useState } from "react";
import { trackTx, walletError, type TxInfo } from "@/lib/client";
import { EXPLORER } from "@/lib/config";

export type TxState = { phase: "idle" | "signing" | "pending" | "done" | "failed"; hash?: string; info?: TxInfo; message?: string };

/** Send one write and follow it until validators decide. */
export function useTx() {
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const run = useCallback(async (send: () => Promise<`0x${string}`>): Promise<TxInfo | null> => {
    setState({ phase: "signing" });
    try {
      const hash = await send();
      setState({ phase: "pending", hash });
      const info = await trackTx(hash, (update) => setState({ phase: "pending", hash, info: update }));
      setState({ phase: info.success ? "done" : "failed", hash, info, message: info.success ? undefined : `Transaction ${info.status.toLowerCase()}` });
      return info;
    } catch (error) {
      setState({ phase: "failed", message: walletError(error) });
      return null;
    }
  }, []);
  return { state, run, reset: () => setState({ phase: "idle" }) };
}

export function TxLine({ state, done }: { state: TxState; done?: React.ReactNode }) {
  if (state.phase === "idle") return null;
  const link = state.hash ? <a href={`${EXPLORER}/tx/${state.hash}`} target="_blank" rel="noreferrer">{state.hash.slice(0, 14)}… ↗</a> : null;
  if (state.phase === "signing") return <div className="status">Waiting for your signature…</div>;
  if (state.phase === "pending") {
    const votes = state.info?.votes?.filter((v) => v === "agree").length ?? 0;
    return <div className="status">Validators are deciding{votes ? ` (${votes} agree so far)` : ""}… {link}</div>;
  }
  if (state.phase === "done") return <div className="status good">{done ?? "Done."} {link}</div>;
  return <div className="status bad">{state.message ?? "Failed."} {link}</div>;
}
