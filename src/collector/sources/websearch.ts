import type { BrandConfig } from "../../lib/brands";
import type { SourceId } from "../../lib/types";
import { clip, env, fetchJson, isoOrNow, mentionsBrand, type RawHit } from "../util";

/**
 * Google Programmable Search (Custom Search JSON API) — FREE 100 queries/day,
 * then $5 / 1,000. This is our catch-all for forums, blogs, and Q&A sites.
 *
 * Setup:
 *   GOOGLE_API_KEY  — same key works for YouTube + Custom Search
 *   GOOGLE_CSE_ID   — the `cx` id from programmablesearchengine.google.com
 *                     (configure it to "Search the entire web")
 */
const API = "https://www.googleapis.com/customsearch/v1";

/** Domains we treat as trade forums rather than generic web. */
const FORUM_DOMAINS = [
  "lawnsite.com",
  "greenindustrypros.com",
  "forum",
  "/forums",
  "houzz.com",
];

interface CseResp {
  items?: {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
    pagemap?: {
      metatags?: { "article:published_time"?: string }[];
    };
  }[];
}

/** Map a result URL to the right source card. Reddit threads come through here
 *  too — so the Reddit card is populated WITHOUT the Reddit API. */
function classifySource(link: string): SourceId {
  const l = link.toLowerCase();
  if (l.includes("reddit.com")) return "reddit";
  if (l.includes("youtube.com") || l.includes("youtu.be")) return "youtube";
  return FORUM_DOMAINS.some((d) => l.includes(d)) ? "forums" : "web";
}

/** Buying-intent words that surface "which should I get" style threads. */
const INTENT = "(vs OR review OR recommend OR best OR which OR alternative)";

/**
 * Builds the query set for a brand:
 *  - a brand-name query (true mentions)
 *  - a "brand vs competitor / review" query (comparisons that name us)
 *  - a Reddit-targeted query (real threads, direct links, no Reddit API)
 *  - one query per top-2 competitors with buying intent (opportunities —
 *    threads where someone is shopping a competitor and we can step in)
 */
function buildQueries(brand: BrandConfig): string[] {
  const competitors = brand.competitors.filter((c) => !c.includes(" vs "));
  const queries = [
    `"${brand.name}"`,
    `"${brand.name}" ${INTENT}`,
    `site:reddit.com "${brand.name}" OR "${competitors[0] ?? brand.name}"`,
  ];
  for (const competitor of competitors.slice(0, 2)) {
    queries.push(`"${competitor}" ${INTENT}`);
  }
  return queries;
}

export async function collectWebSearch(brand: BrandConfig): Promise<RawHit[]> {
  const key = env("GOOGLE_API_KEY");
  const cx = env("GOOGLE_CSE_ID");
  if (!key || !cx) {
    console.warn("  [web] GOOGLE_API_KEY / GOOGLE_CSE_ID not set — skipping");
    return [];
  }

  const seen = new Set<string>();
  const hits: RawHit[] = [];

  for (const q of buildQueries(brand)) {
    let data: CseResp;
    try {
      data = await fetchJson<CseResp>(
        `${API}?key=${key}&cx=${cx}&dateRestrict=m1&num=10&q=${encodeURIComponent(q)}`,
      );
    } catch (e) {
      console.warn(`  [web] query failed (${q}): ${String(e).slice(0, 80)}`);
      continue;
    }

    for (const item of data.items ?? []) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      const blob = `${item.title} ${item.snippet}`;
      const published = item.pagemap?.metatags?.[0]?.["article:published_time"];
      hits.push({
        brand: brand.id,
        source: classifySource(item.link),
        title: clip(item.title, 120),
        excerpt: clip(item.snippet),
        url: item.link,
        author: item.displayLink,
        context: item.displayLink,
        publishedAt: isoOrNow(published),
        engagement: 0,
        brandMentioned: mentionsBrand(blob, brand.keywords),
      });
    }
  }

  return hits;
}
