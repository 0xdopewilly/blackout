// Contract reads for every page: one cached read of the whole book, refreshed at most every
// BOOK_TTL seconds, because Studio Next rate-limits gen_call (about 20 reads per 10 s per
// contract). If the contract cannot be read, pages fall back to data/snapshot.json, labelled as a
// stored snapshot, and only when it was taken from this same contract.
//
// Transaction hashes are not contract state: data/txs.json, built by scripts/tx_table.py from the
// evidence log, maps each entity-week to the transactions that touched it.
import { chains, createClient } from "genlayer-js";
import { unstable_cache } from "next/cache";
import snapshot from "../../data/snapshot.json";
import txIndex from "../../data/txs.json";
import { CONTRACT } from "./config";
import type { Book, Config, Observation, Policy, Pool, Terms, TxRef } from "./types";

const BOOK_TTL = 20;
const READ_TIMEOUT_MS = 9000;

export async function readRaw(functionName: string, args: (string | number)[] = []): Promise<string> {
  const client = createClient({ chain: chains.studioDevnet });
  const read = client.readContract({ address: CONTRACT, functionName, args });
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("read timed out")), READ_TIMEOUT_MS));
  return String(await Promise.race([read, timeout]));
}

export async function view<T>(functionName: string, args: (string | number)[] = []): Promise<T> {
  return JSON.parse(await readRaw(functionName, args)) as T;
}

const readBook = unstable_cache(
  async (): Promise<Book> => {
    const [config, terms, ledger, pool, policies, accounting] = await Promise.all([
      view<Config>("get_config"),
      view<Terms[]>("list_terms"),
      view<Observation[]>("list_ledger"),
      view<Pool>("get_pool"),
      view<{ items: Policy[] }>("list_policies", [0, 100]),
      view<Record<string, string | boolean>>("get_accounting"),
    ]);
    return { live: true, as_of: new Date().toISOString(), contract: CONTRACT, config, terms, ledger, pool, policies: policies.items, accounting };
  },
  ["blackout-book", CONTRACT.toLowerCase()],
  { revalidate: BOOK_TTL, tags: ["book"] },
);

function fromSnapshot(): Book {
  const snap = snapshot as unknown as Book & { contract: string };
  if (!snap.contract || snap.contract.toLowerCase() !== CONTRACT.toLowerCase()) {
    return { live: false, as_of: "", contract: CONTRACT, config: null, terms: [], ledger: [], pool: null, policies: [], accounting: null };
  }
  return { ...snap, live: false };
}

export async function loadBook(): Promise<Book> {
  try {
    return await readBook();
  } catch {
    return fromSnapshot();
  }
}

const index = txIndex as { contract: string; weeks: Record<string, TxRef[]>; all: TxRef[] };

export function txsFor(entity: string, weekStart: number): TxRef[] {
  if (!index.contract || index.contract.toLowerCase() !== CONTRACT.toLowerCase()) return [];
  return index.weeks[`${entity}|${weekStart}`] ?? [];
}

export function allTxs(): TxRef[] {
  return index.contract && index.contract.toLowerCase() === CONTRACT.toLowerCase() ? index.all : [];
}
