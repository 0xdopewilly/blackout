// Browser-side GenLayer writes from either wallet kind, and transaction tracking.
import { chains, createAccount, createClient } from "genlayer-js";
import type { Hex } from "viem";
import { CONTRACT, STUDIO_CHAIN_ID, STUDIO_RPC, EXPLORER } from "./config";

export type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

/** Who signs: the built-in test wallet's local key, or a browser wallet through its provider. */
export type Signer = { kind: "local"; key: Hex; address: `0x${string}` } | { kind: "provider"; address: `0x${string}`; provider: Eip1193 };

function clientFor(signer: Signer) {
  if (signer.kind === "local") return createClient({ chain: chains.studioDevnet, account: createAccount(signer.key) });
  return createClient({ chain: chains.studioDevnet, account: signer.address, provider: signer.provider as never });
}

export function toWei(amount: string): bigint {
  const [whole, fraction = ""] = amount.trim().split(".");
  return BigInt(whole || "0") * 10n ** 18n + BigInt((fraction + "0".repeat(18)).slice(0, 18) || "0");
}

/** Estimate fees and send one BlackoutBook write. Returns the GenLayer transaction hash. */
export async function sendWrite(signer: Signer, method: string, args: (string | number)[], value: bigint = 0n): Promise<`0x${string}`> {
  const client = clientFor(signer);
  const estimate = await client.estimateTransactionFees();
  return client.writeContract({
    address: CONTRACT,
    functionName: method,
    args,
    value,
    fees: { distribution: estimate.distribution, feeValue: estimate.feeValue },
  });
}

export interface TxInfo {
  hash: string;
  status: string;
  execution: string;
  decided: boolean;
  success: boolean;
  votes: string[];
  returned: { ok: boolean; value?: unknown; error?: string } | null;
}

/** Poll /api/tx until validators decide. */
export async function trackTx(hash: string, onUpdate: (info: TxInfo) => void, timeoutMs = 600_000): Promise<TxInfo> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const info = (await (await fetch(`/api/tx?hash=${hash}`, { cache: "no-store" })).json()) as TxInfo;
      onUpdate(info);
      if (info.decided) return info;
    } catch {
      // keep polling through transient errors
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("Timed out waiting for validators");
}

export async function requestTestGen(address: string): Promise<void> {
  const response = await fetch("/api/faucet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
  const body = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !body.ok) throw new Error(body.error || "Faucet unavailable");
}

/** Ask a browser wallet for an account and put it on GenLayer Studio Next. */
export async function connectBrowserWallet(provider: Eip1193): Promise<`0x${string}`> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No account was shared");
  const chainId = "0x" + STUDIO_CHAIN_ID.toString(16);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902 && code !== -32603) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId, chainName: "GenLayer Studio Next", nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: [STUDIO_RPC], blockExplorerUrls: [EXPLORER] }],
    });
  }
  return accounts[0].toLowerCase() as `0x${string}`;
}

/** Human message for a wallet or RPC error, including the common EIP-1193 codes. */
export function walletError(error: unknown): string {
  const record = (error ?? {}) as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } };
  const code = record.code ?? record.cause?.code;
  if (code === 4001) return "You rejected the request in your wallet.";
  if (code === -32002) return "Your wallet already has a request open. Check the extension.";
  const text = record.shortMessage || record.message || String(error);
  return text.length > 200 ? text.slice(0, 200) + "…" : text;
}
