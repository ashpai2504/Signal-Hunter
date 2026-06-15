import type { BrandConfig } from "../../lib/brands";
import { clip, isoOrNow, mentionsBrand, USER_AGENT, type RawHit } from "../util";

/**
 * Google News RSS — FREE, NO API KEY. Returns real, dated, clickable articles.
 *
 * This is the one source that works with zero setup, so `npm run collect`
 * produces real links out of the box. The link is a news.google.com URL that
 * redirects to the publisher in the browser. Coverage is news/press only —
 * for Reddit/forum/blog chatter use the Google Custom Search collector (1 key).
 */
const RSS = "https://news.google.com/rss/search";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function tag(item: string, name: string): string | undefined {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1].trim()) : undefined;
}

/** Google News titles end with " - Publisher"; split that off. */
function splitTitle(raw: string): { title: string; publisher?: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx > 0 && idx > raw.length - 60) {
    return { title: raw.slice(0, idx).trim(), publisher: raw.slice(idx + 3).trim() };
  }
  return { title: raw };
}

async function fetchFeed(query: string): Promise<string> {
  const url = `${RSS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function collectGoogleNews(brand: BrandConfig): Promise<RawHit[]> {
  // A brand-name query (these ARE brand mentions — we searched the brand) plus
  // competitor queries (opportunities — competitor press we can react to).
  const queries: { q: string; brandQuery: boolean }[] = [
    { q: `"${brand.name}"`, brandQuery: true },
    ...brand.competitors
      .filter((c) => !c.includes(" vs "))
      .slice(0, 2)
      .map((c) => ({
        q: `"${c}" (${brand.category.replace(/-/g, " ")})`,
        brandQuery: false,
      })),
  ];

  const seen = new Set<string>();
  const hits: RawHit[] = [];

  for (const { q, brandQuery } of queries) {
    let xml: string;
    try {
      xml = await fetchFeed(q);
    } catch (e) {
      console.warn(`  [news] query failed (${q}): ${String(e).slice(0, 80)}`);
      continue;
    }

    const items = xml.split("<item>").slice(1);
    for (const item of items.slice(0, 12)) {
      const rawTitle = tag(item, "title");
      const link = tag(item, "link");
      if (!rawTitle || !link || seen.has(link)) continue;
      seen.add(link);

      const { title, publisher } = splitTitle(rawTitle);
      const sourceName =
        item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? publisher;

      hits.push({
        brand: brand.id,
        source: "news",
        title: clip(title, 140),
        excerpt: clip(rawTitle),
        url: link,
        author: sourceName ? decodeEntities(sourceName) : undefined,
        context: sourceName ? decodeEntities(sourceName) : "Google News",
        publishedAt: isoOrNow(tag(item, "pubDate")),
        engagement: 0,
        // Brand-query results are brand mentions; competitor-query results count
        // only if the brand is actually named (otherwise they're opportunities).
        brandMentioned: brandQuery || mentionsBrand(rawTitle, brand.keywords),
      });
    }
  }

  return hits;
}
