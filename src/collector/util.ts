import type { BrandId, SourceId } from "../lib/types";

/** A candidate mention before classification (no signal/sentiment yet). */
export interface RawHit {
  brand: BrandId;
  source: SourceId;
  title: string;
  excerpt: string;
  url: string;
  author?: string;
  context?: string;
  publishedAt: string;
  engagement: number;
  /**
   * Did the text actually name our brand? False for competitor-only threads we
   * pull in as opportunities ("someone asking about Rain Bird"). Source-card
   * counts only include true brand mentions; opportunities include both.
   */
  brandMentioned: boolean;
  /**
   * What kind of thread this is, which biases classification:
   *  - "brand": names our brand
   *  - "competitor": names a competitor (open-field opportunity)
   *  - "topic": matched an intent keyword like "sprinkler not working"
   */
  kind?: "brand" | "competitor" | "topic";
}

export const USER_AGENT =
  "SignalMonitor/0.1 (Hunter Industries brand-monitoring; contact: marketing@hunterindustries.com)";

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Keep an excerpt readable in the UI. */
export function clip(text: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

/**
 * Does this text plausibly mention the brand? Cheap pre-filter so we don't
 * pay the LLM to classify obvious noise. Case-insensitive substring match on
 * any configured keyword.
 */
export function mentionsBrand(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** Which competitor brands are named in this text (de-duplicated, canonical). */
export function detectCompetitors(text: string, competitors: string[]): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const c of competitors) {
    // Skip phrase-style entries like "Hunter vs Rain Bird" used only for search.
    if (c.includes(" vs ")) continue;
    if (lower.includes(c.toLowerCase())) {
      // Canonicalize "Rainbird" -> "Rain Bird", "VOLT" -> "Volt Lighting".
      found.add(c.replace(/^Rainbird$/i, "Rain Bird"));
    }
  }
  return [...found];
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} for ${url}: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

export function isoOrNow(value?: string | number): string {
  if (value == null) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
