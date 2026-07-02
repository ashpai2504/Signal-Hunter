/**
 * Collector orchestrator — run with `npm run collect`.
 *
 * For every brand it queries each source, pre-filters by keyword, classifies
 * each hit (Groq or heuristic), then merges the results into data/mentions.json.
 *
 * Every source degrades gracefully: a missing API key just logs a warning and
 * contributes zero hits, so you can wire keys in one at a time.
 */
import "dotenv/config";
import type { BRANDS } from "../lib/brands";
import { effectiveBrands } from "../lib/config";
import { upsertMentions } from "../lib/store";
import type { Mention } from "../lib/types";
import { collectGoogleNews } from "./sources/googlenews";
import { collectYouTube } from "./sources/youtube";
import { collectApifyReddit } from "./sources/apify-reddit";
import { collectWebSearch } from "./sources/websearch";
import { classifyHit } from "./classify";
import type { RawHit } from "./util";

type SourceFn = (brand: (typeof BRANDS)[number]) => Promise<RawHit[]>;

const SOURCE_FNS: { name: string; fn: SourceFn }[] = [
  // news needs no API key — always runs, so `collect` produces real links.
  { name: "news", fn: collectGoogleNews },
  { name: "reddit", fn: collectApifyReddit }, // via Apify (no Reddit API)
  { name: "youtube", fn: collectYouTube }, // needs GOOGLE_API_KEY
  { name: "web", fn: collectWebSearch }, // needs GOOGLE_API_KEY + GOOGLE_CSE_ID
];

async function main() {
  const started = Date.now();
  console.log("Signal collector starting…");

  // Brand configs with any dashboard-added products/subreddits/competitors.
  const brands = await effectiveBrands();

  const allHits: RawHit[] = [];
  for (const brand of brands) {
    console.log(`\n# ${brand.name}`);
    for (const { name, fn } of SOURCE_FNS) {
      try {
        const hits = await fn(brand);
        console.log(`  [${name}] ${hits.length} hits`);
        allHits.push(...hits);
      } catch (e) {
        console.warn(`  [${name}] failed: ${String(e).slice(0, 160)}`);
      }
    }
  }

  if (allHits.length === 0) {
    console.log(
      "\nNo hits collected. Set API keys in .env (see .env.example) — " +
        "or run `npm run seed` for mock data.",
    );
    return;
  }

  console.log(`\nClassifying ${allHits.length} hits…`);
  const brandById = Object.fromEntries(brands.map((b) => [b.id, b]));
  // Classify in small parallel batches — the LLM call dominates runtime.
  const mentions: Mention[] = [];
  const BATCH = 8;
  for (let i = 0; i < allHits.length; i += BATCH) {
    const batch = allHits.slice(i, i + BATCH);
    mentions.push(
      ...(await Promise.all(
        batch.map((hit) => classifyHit(hit, brandById[hit.brand])),
      )),
    );
    if (i > 0 && i % 80 === 0) console.log(`  …${i}/${allHits.length}`);
  }

  const store = await upsertMentions(mentions);
  console.log(
    `\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s · ` +
      `${mentions.length} new/updated · ${store.mentions.length} total in store.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
