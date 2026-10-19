// Headlines for a covered week, for display only: the same Google News query and outlet allowlist
// the validators use (lib/news_evidence.py), fetched by this website. Each validator fetched and
// judged its own copy; the contract stores only the class they all reproduced.
import { unstable_cache } from "next/cache";

const OUTLETS = ["apnews.com", "reuters.com", "afp.com", "bbc.com", "bbc.co.uk", "theguardian.com", "aljazeera.com", "france24.com", "dw.com", "rfi.fr", "nytimes.com", "washingtonpost.com", "wsj.com", "bloomberg.com", "ft.com", "economist.com", "cnn.com", "npr.org", "voanews.com", "rfa.org", "rferl.org", "pbs.org", "cbsnews.com", "nbcnews.com", "abcnews.go.com", "thehill.com", "axios.com", "time.com", "theverge.com", "wired.com", "techcrunch.com", "arstechnica.com", "restofworld.org", "techpolicy.press", "jurist.org", "theconversation.com", "aa.com.tr", "africanews.com", "theafricareport.com", "businessinsider.com", "accessnow.org", "netblocks.org", "hrw.org", "amnesty.org", "cpj.org", "rsf.org", "eff.org", "article19.org", "internetsociety.org", "ooni.org", "freedomhouse.org", "blog.cloudflare.com", "thedailystar.net", "prothomalo.com", "en.prothomalo.com", "tbsnews.net", "dhakatribune.com", "bdnews24.com", "newagebd.net", "thehindu.com", "hindustantimes.com", "indianexpress.com", "livemint.com", "indiatoday.in", "scroll.in", "thewire.in", "internetshutdowns.in", "dawn.com", "geo.tv", "tribune.com.pk", "myjoyonline.com", "graphic.com.gh", "citinewsroom.com", "modernghana.com", "premiumtimesng.com", "channelstv.com", "punchng.com", "techcabal.com", "techpoint.africa", "news24.com", "iol.co.za", "nation.africa", "theeastafrican.co.ke", "addisstandard.com", "kyivindependent.com", "iranintl.com", "iranwire.com", "irrawaddy.com", "frontiermyanmar.net", "thediplomat.com", "scmp.com", "nikkei.com", "asia.nikkei.com", "japantimes.co.jp", "middleeasteye.net"];
const MAX_ITEMS = 12;

function ymd(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function newsUrl(country: string, weekStart: number): string {
  const q = `"${country}" internet (shutdown OR blackout OR outage OR cut) after:${ymd(weekStart - 86400)} before:${ymd(weekStart + 16 * 86400)}`;
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(q).replace(/%20/g, "+") + "&hl=en-US&gl=US&ceid=US:en";
}

const allowed = (domain: string) => OUTLETS.some((d) => domain === d || domain.endsWith("." + d));
const unescape = (t: string) =>
  t.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const clean = (t: string) => unescape(t).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufeff]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);

export interface Headline { title: string; domain: string; }

export function parseFeed(xml: string): Headline[] {
  const out: Headline[] = [];
  const seen = new Set<string>();
  for (const block of xml.split("<item>").slice(1)) {
    const item = block.split("</item>")[0];
    const url = /<source[^>]*url="([^"]+)"/.exec(item)?.[1] ?? "";
    let domain = url.replace(/^[a-z]+:\/\//i, "").split("/")[0].toLowerCase();
    if (domain.startsWith("www.")) domain = domain.slice(4);
    if (!allowed(domain)) continue;
    const outlet = clean(/<source[^>]*>([\s\S]*?)<\/source>/.exec(item)?.[1] ?? "");
    let title = unescape(/<title>([\s\S]*?)<\/title>/.exec(item)?.[1] ?? "");
    if (outlet && title.endsWith(" - " + outlet)) title = title.slice(0, -(" - " + outlet).length);
    title = clean(title);
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push({ title, domain });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function loadHeadlines(country: string, weekStart: number): Promise<Headline[]> {
  return unstable_cache(
    async () => {
      const response = await fetch(newsUrl(country, weekStart), { headers: { Accept: "application/rss+xml" } });
      if (!response.ok) throw new Error(`news ${response.status}`);
      return parseFeed(await response.text());
    },
    ["news-week", country, String(weekStart)],
    { revalidate: 86400 },
  )().catch(() => []);
}
