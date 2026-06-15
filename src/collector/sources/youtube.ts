import type { BrandConfig } from "../../lib/brands";
import { clip, env, fetchJson, isoOrNow, mentionsBrand, type RawHit } from "../util";

/**
 * YouTube Data API v3 — FREE, 10,000 quota units/day.
 *   search.list  = 100 units/call   (we keep this small)
 *   commentThreads.list = 1 unit/call
 *
 * Strategy: find recent videos for a brand keyword, then pull a few comment
 * threads per video that also mention the brand. Both videos and matching
 * comments become mentions.
 */
const API = "https://www.googleapis.com/youtube/v3";

interface SearchResp {
  items?: {
    id: { videoId?: string };
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      publishedAt: string;
    };
  }[];
}

interface CommentResp {
  items?: {
    snippet: {
      topLevelComment: {
        snippet: {
          textDisplay: string;
          authorDisplayName: string;
          likeCount: number;
          publishedAt: string;
        };
      };
    };
  }[];
}

export async function collectYouTube(brand: BrandConfig): Promise<RawHit[]> {
  const key = env("YOUTUBE_API_KEY");
  if (!key) {
    console.warn("  [youtube] YOUTUBE_API_KEY not set — skipping");
    return [];
  }

  const hits: RawHit[] = [];
  // Use the brand's primary keyword to keep the (expensive) search count low.
  const query = brand.keywords[0];
  const search = await fetchJson<SearchResp>(
    `${API}/search?part=snippet&type=video&order=date&maxResults=8` +
      `&publishedAfter=${new Date(Date.now() - 30 * 86400000).toISOString()}` +
      `&q=${encodeURIComponent(query)}&key=${key}`,
  );

  for (const v of search.items ?? []) {
    const videoId = v.id.videoId;
    if (!videoId) continue;
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // The video itself, if it mentions the brand in title/description.
    if (mentionsBrand(`${v.snippet.title} ${v.snippet.description}`, brand.keywords)) {
      hits.push({
        brand: brand.id,
        source: "youtube",
        title: v.snippet.title,
        excerpt: clip(v.snippet.description),
        url,
        author: v.snippet.channelTitle,
        context: v.snippet.channelTitle,
        publishedAt: isoOrNow(v.snippet.publishedAt),
        engagement: 0,
        brandMentioned: true,
      });
    }

    // A few comments on that video matching the brand.
    try {
      const comments = await fetchJson<CommentResp>(
        `${API}/commentThreads?part=snippet&videoId=${videoId}` +
          `&maxResults=20&order=relevance&searchTerms=${encodeURIComponent(query)}&key=${key}`,
      );
      for (const c of comments.items ?? []) {
        const s = c.snippet.topLevelComment.snippet;
        if (!mentionsBrand(s.textDisplay, brand.keywords)) continue;
        hits.push({
          brand: brand.id,
          source: "youtube",
          title: clip(s.textDisplay, 80),
          excerpt: clip(s.textDisplay),
          url: `${url}&lc=`,
          author: s.authorDisplayName,
          context: v.snippet.channelTitle,
          publishedAt: isoOrNow(s.publishedAt),
          engagement: s.likeCount ?? 0,
          brandMentioned: true,
        });
      }
    } catch (e) {
      // Comments may be disabled on a video — that's fine, keep going.
      console.warn(`  [youtube] comments failed for ${videoId}: ${String(e).slice(0, 80)}`);
    }
  }

  return hits;
}
