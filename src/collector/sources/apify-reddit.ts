import type { BrandConfig } from "../../lib/brands";
import { brandTopics } from "../../lib/brands";
import {
  clip,
  detectCompetitors,
  detectProducts,
  env,
  isoOrNow,
  mentionsBrand,
  type RawHit,
} from "../util";

/** Split a list into `"a" OR "b" OR ...` query strings of at most `size` items. */
function orChunks(items: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(
      items
        .slice(i, i + size)
        .map((x) => `"${x}"`)
        .join(" OR "),
    );
  }
  return out;
}

/**
 * Reddit via the Apify "Reddit Scraper" actor — real posts + comments with
 * direct links, no Reddit API credentials. Uses your Apify token (free tier
 * gives ~$5/mo of credits). Set APIFY_TOKEN in .env to enable.
 *
 * One synchronous run per brand searches the brand name + top competitors, so
 * a single run yields both brand mentions and competitor "open field" threads.
 */
const ACTOR = "spry_wholemeal~reddit-scraper";

interface RedditPost {
  title?: string;
  text?: string;
  author?: string;
  url?: string;
  permalink?: string;
  created_utc_iso?: string;
  score?: number;
  num_comments?: number;
  /** Which of our queries this post matched — lets us categorize it. */
  matched_search_queries?: string[];
}

export async function collectApifyReddit(brand: BrandConfig): Promise<RawHit[]> {
  const token = env("APIFY_TOKEN");
  if (!token) {
    console.warn("  [apify-reddit] APIFY_TOKEN not set — skipping");
    return [];
  }

  // Quote every phrase so Reddit does EXACT matching (unquoted "Hunter
  // Industries" matches "K-Pop Demon Hunters" + "industry" — pure noise).
  // Category qualifier keeps ambiguous terms on-topic ("Toro" the brand, not
  // the rhythm-game player; "solenoid not working" in an irrigation context).
  const qualifier =
    brand.category === "irrigation"
      ? "(sprinkler OR irrigation OR lawn OR watering)"
      : "(landscape OR lighting OR outdoor OR fixture)";

  const brandQuery = brand.keywords.map((k) => `"${k}"`).join(" OR ");
  // Product-name queries (Hydrawise, PGP, X-Core…) — catch posts that name a
  // product without the brand phrase. Chunked to stay under query length caps.
  const productQueries = orChunks(brand.products, 8).map(
    (q) => `(${q}) ${qualifier}`,
  );
  const competitorQueries = brand.competitors
    .filter((c) => !c.includes(" vs "))
    .slice(0, 4)
    .map((c) => `"${c}" ${qualifier}`);
  // Topic/intent queries — the volume driver.
  const topicQueries = brandTopics(brand).map((t) => `"${t}" ${qualifier}`);
  // Bare brand word searched INSIDE the brand's own communities — catches posts
  // like "new hunter controller?" in r/Irrigation that no product phrase hits.
  // Only for unambiguous words (5+ chars), so "FX" alone is never searched.
  const bareWord = brand.shortName.split(/\s+/)[0];
  const bareTargets =
    bareWord.length >= 5
      ? brand.channels.subreddits.slice(0, 4).map((subreddit) => ({
          query: bareWord,
          restrictToSubreddit: subreddit,
          searchSort: "new",
          timeframe: "year",
          maxResults: 15,
        }))
      : [];

  const compSet = new Set(competitorQueries);
  const topicSet = new Set(topicQueries);
  // Relevant communities for this brand (lower-cased).
  const relevantSubs = new Set(
    brand.channels.subreddits.map((s) => s.toLowerCase()),
  );
  // Strong category phrases — a thread in ANY sub that contains one of these is
  // on-topic. This keeps real lighting/irrigation threads that live outside the
  // whitelist, while still dropping homonym noise (r/osugame "Toro", movies).
  const categoryTerms =
    brand.category === "irrigation"
      ? [
          "sprinkler",
          "irrigation",
          "drip line",
          "rotor",
          "valve box",
          "backflow",
          "rain bird",
          "rainbird",
          "hydrawise",
          "watering schedule",
        ]
      : [
          "landscape lighting",
          "landscape light",
          "low voltage",
          "outdoor lighting",
          "uplighting",
          "path light",
          "color temperature",
          "led fixture",
          "landscape transformer",
          "2700k",
          "3000k",
        ];

  // Sort by NEW so every run pulls the latest posts (relevance sort just keeps
  // re-fetching the same old high-ranking threads). The store accumulates +
  // dedupes, so fresh posts get added each run while history is retained.
  const target = (query: string, maxResults: number) => ({
    query,
    searchSort: "new",
    timeframe: "year",
    maxResults,
  });
  const input = {
    mode: "search", // REQUIRED — without it the actor ignores the query.
    searchTargets: [
      target(brandQuery, 30),
      ...bareTargets,
      ...productQueries.map((q) => target(q, 10)),
      ...competitorQueries.map((q) => target(q, 12)),
      ...topicQueries.map((q) => target(q, 6)),
    ],
  };

  let items: RedditPost[];
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!res.ok) {
      console.warn(`  [apify-reddit] HTTP ${res.status}`);
      return [];
    }
    items = (await res.json()) as RedditPost[];
  } catch (e) {
    console.warn(`  [apify-reddit] error: ${String(e).slice(0, 120)}`);
    return [];
  }

  const hits: RawHit[] = [];
  for (const p of items) {
    if (!p.title && !p.text) continue;
    const blob = `${p.title ?? ""} ${p.text ?? ""}`;
    const matched = p.matched_search_queries ?? [];

    // permalink may be a path ("/r/...") or already a full URL — handle both.
    const raw = p.permalink ?? p.url ?? "";
    const url = !raw
      ? ""
      : raw.startsWith("http")
        ? raw
        : `https://www.reddit.com${raw}`;
    if (!url) continue;
    const sub = (p.permalink ?? p.url ?? "").match(/\/r\/([^/]+)/)?.[1];
    const subOk = sub ? relevantSubs.has(sub.toLowerCase()) : false;

    // Categorize: brand mention > competitor thread > topic/intent thread.
    // A brand mention is any of: a keyword phrase ("Hunter Pro-C"), a product
    // name (fuzzy, so "rainclik" works), or the bare brand word inside one of
    // the brand's own communities ("hunter" in r/Irrigation).
    const bareRe = new RegExp(`\\b${bareWord.toLowerCase()}\\b`);
    const isBrand =
      mentionsBrand(blob, brand.keywords) ||
      detectProducts(blob, brand.products, true).length > 0 ||
      (bareWord.length >= 5 && subOk && bareRe.test(blob.toLowerCase()));
    const hasCompetitor =
      detectCompetitors(blob, brand.competitors).length > 0 ||
      matched.some((q) => compSet.has(q));
    const isTopic = matched.some((q) => topicSet.has(q));
    const lower = blob.toLowerCase();
    const onTopic = subOk || categoryTerms.some((term) => lower.includes(term));

    // Keep brand mentions anywhere; competitor/topic threads must be on-topic
    // (relevant sub OR a strong category phrase) so homonym noise is dropped.
    if (isBrand) {
      /* keep */
    } else if ((hasCompetitor || isTopic) && onTopic) {
      /* keep */
    } else {
      continue;
    }
    const kind: RawHit["kind"] = isBrand
      ? "brand"
      : hasCompetitor
        ? "competitor"
        : "topic";
    hits.push({
      brand: brand.id,
      source: "reddit",
      title: clip(p.title ?? blob, 120),
      excerpt: clip(p.text || p.title || ""),
      url,
      author: p.author ? `u/${p.author}` : undefined,
      context: sub ? `r/${sub}` : "Reddit",
      publishedAt: isoOrNow(p.created_utc_iso),
      engagement: (p.score ?? 0) + (p.num_comments ?? 0),
      brandMentioned: isBrand,
      kind,
    });
  }
  return hits;
}
