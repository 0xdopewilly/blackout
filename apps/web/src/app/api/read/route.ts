import { readRaw } from "@/lib/data";

// GET /api/read?m=<view>&a=<json args> for the few views the browser needs. Only these methods,
// so the endpoint cannot be used to hammer the contract's rate limit with arbitrary reads.
const ALLOWED: Record<string, number> = { quote: 3, policies_of: 1, get_lp: 1, get_claimable: 1 };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const method = url.searchParams.get("m") ?? "";
  let args: (string | number)[] = [];
  try {
    args = JSON.parse(url.searchParams.get("a") ?? "[]");
  } catch {
    return Response.json({ error: "a must be a JSON array" }, { status: 400 });
  }
  if (!(method in ALLOWED) || !Array.isArray(args) || args.length !== ALLOWED[method] || !args.every((x) => typeof x === "string" || typeof x === "number")) {
    return Response.json({ error: "unsupported read" }, { status: 400 });
  }
  try {
    const raw = await readRaw(method, args);
    return new Response(raw, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: String(error).slice(0, 200) }, { status: 502 });
  }
}
