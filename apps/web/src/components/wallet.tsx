"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { connectBrowserWallet, requestTestGen, walletError, type Eip1193, type Signer } from "@/lib/client";
import { short } from "@/lib/format";

// Two ways to sign on Studio Next: a test wallet whose key stays in this browser (funded from the
// Studio faucet, no install), or a browser wallet such as MetaMask switched to Studio Next.
const KEY = "blackout.testkey.v1";
const KIND = "blackout.wallet.v1";

type Wallet = {
  signer: Signer | null;
  address: string;
  kind: "" | "test" | "browser";
  busy: string;
  error: string;
  connectTest: () => void;
  connectBrowser: () => Promise<void>;
  disconnect: () => void;
  faucet: () => Promise<void>;
};

const Ctx = createContext<Wallet | null>(null);

function testKey(): Hex {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && /^0x[0-9a-f]{64}$/i.test(stored)) return stored as Hex;
    const fresh = generatePrivateKey();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return generatePrivateKey();
  }
}

function ethereum(): Eip1193 | null {
  return typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) : null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [kind, setKind] = useState<Wallet["kind"]>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const connectTest = useCallback(() => {
    const key = testKey();
    setSigner({ kind: "local", key, address: privateKeyToAccount(key).address.toLowerCase() as `0x${string}` });
    setKind("test");
    setError("");
    try { localStorage.setItem(KIND, "test"); } catch {}
  }, []);

  const connectBrowser = useCallback(async () => {
    const provider = ethereum();
    if (!provider) {
      setError("No browser wallet found. Use the test wallet, or open this page in a wallet's browser.");
      return;
    }
    setBusy("Connecting your wallet…");
    try {
      const address = await connectBrowserWallet(provider);
      setSigner({ kind: "provider", address, provider });
      setKind("browser");
      setError("");
      try { localStorage.setItem(KIND, "browser"); } catch {}
    } catch (e) {
      setError(walletError(e));
    } finally {
      setBusy("");
    }
  }, []);

  const disconnect = useCallback(() => {
    setSigner(null);
    setKind("");
    try { localStorage.removeItem(KIND); } catch {}
  }, []);

  const faucet = useCallback(async () => {
    if (!signer) return;
    setBusy("Asking the Studio faucet for 25 test GEN…");
    try {
      await requestTestGen(signer.address);
      setError("");
    } catch (e) {
      setError(walletError(e));
    } finally {
      setBusy("");
    }
  }, [signer]);

  useEffect(() => {
    try {
      if (localStorage.getItem(KIND) === "test") connectTest();
    } catch {}
  }, [connectTest]);

  const value = useMemo(
    () => ({ signer, address: signer?.address ?? "", kind, busy, error, connectTest, connectBrowser, disconnect, faucet }),
    [signer, kind, busy, error, connectTest, connectBrowser, disconnect, faucet],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): Wallet {
  const wallet = useContext(Ctx);
  if (!wallet) throw new Error("useWallet outside WalletProvider");
  return wallet;
}

export function WalletButton() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => box.current && !box.current.contains(event.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="wallet" ref={box}>
      <button type="button" className={`btn ${wallet.address ? "ghost" : "primary"} small`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {wallet.address ? <><span className="dot on" />{short(wallet.address)}</> : "Connect"}
      </button>
      {open && (
        <div className="menu" role="menu">
          {!wallet.address ? (
            <>
              <button type="button" role="menuitem" onClick={() => (wallet.connectTest(), setOpen(false))}>
                <strong>Test wallet</strong>
                <span>Instant, no install. Free test GEN from the Studio faucet.</span>
              </button>
              <button type="button" role="menuitem" onClick={() => (void wallet.connectBrowser(), setOpen(false))}>
                <strong>Browser wallet</strong>
                <span>MetaMask, Rabby and others, on GenLayer Studio Next.</span>
              </button>
            </>
          ) : (
            <>
              <div className="menu-head">
                <span>{wallet.kind === "test" ? "Test wallet" : "Browser wallet"}</span>
                <code>{wallet.address}</code>
              </div>
              <button type="button" role="menuitem" onClick={() => void wallet.faucet()}>
                <strong>Get 25 test GEN</strong>
                <span>From the Studio Next faucet. It pays fees and premiums here.</span>
              </button>
              <button type="button" role="menuitem" onClick={() => void navigator.clipboard?.writeText(wallet.address)}>
                <strong>Copy address</strong>
              </button>
              <button type="button" role="menuitem" onClick={() => (wallet.disconnect(), setOpen(false))}>
                <strong>Disconnect</strong>
              </button>
            </>
          )}
        </div>
      )}
      {(wallet.busy || wallet.error) && <div className={`toast${wallet.error ? " bad" : ""}`}>{wallet.busy || wallet.error}</div>}
    </div>
  );
}
