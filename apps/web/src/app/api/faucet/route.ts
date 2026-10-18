import { rpc } from "@/lib/rpc";

// POST /api/faucet {address} -> 25 test GEN from the Studio Next faucet. The faucet credits
// Studio's own ledger: it pays fees and premiums on this network although wallets show 0.
const AMOUNT = 25n * 10n ** 18n;
const COOLDOWN_MS = 60_000;
const recent = new Map<string, number>();

export async function POST(request: Request) {
  const { address } = (await request.json().catch(() => ({}))) as { address?: string };
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return Response.json({ error: "a 0x address is required" }, { status: 400 });
  const key = address.toLowerCase();
  if (Date.now() - (recent.get(key) ?? 0) < COOLDOWN_MS) return Response.json({ error: "one request per minute" }, { status: 429 });
  recent.set(key, Date.now());
  try {
    const hash = await rpc<string>("sim_fundAccount", { account_address: address, amount: Number(AMOUNT) });
    return Response.json({ ok: true, hash });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 502 });
  }
}
