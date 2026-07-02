import type { BrandId, Mention, Sentiment, SignalType, SourceId } from "./types";

/** Mentions in the trailing `days` window (default 30). */
export function withinDays(mentions: Mention[], days = 30): Mention[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return mentions.filter((m) => new Date(m.publishedAt).getTime() >= cutoff);
}

export interface SourceSummary {
  source: SourceId;
  total: number;
  sentiment: Record<Sentiment, number>;
  signals: Record<SignalType, number>;
  /** Most recent mentions for this source, newest first. */
  recent: Mention[];
}

export interface BrandSummary {
  brand: BrandId;
  total: number;
  windowDays: number;
  sentiment: Record<Sentiment, number>;
  sources: SourceSummary[];
  /** Top brand mentions across all sources, ranked by engagement. */
  topMentions: Mention[];
  /**
   * The actionable list: conversations where someone is choosing a product or
   * weighing a competitor — places we can step in and win the customer.
   */
  opportunities: Mention[];
  opportunityCount: number;
}

function emptySentiment(): Record<Sentiment, number> {
  return { positive: 0, neutral: 0, negative: 0 };
}

function emptySignals(): Record<SignalType, number> {
  return {
    "buying-decision": 0,
    "competitor-frustration": 0,
    "unanswered-question": 0,
    "brand-mention": 0,
    "content-gap": 0,
  };
}

/** Is this conversation a chance to win a customer or create content? */
export function isOpportunity(m: Mention): boolean {
  return (
    m.signalType === "buying-decision" ||
    m.signalType === "competitor-frustration" ||
    (m.competitors?.length ?? 0) > 0 ||
    // Unanswered questions & content gaps not already on us = reach-first plays.
    ((m.signalType === "unanswered-question" ||
      m.signalType === "content-gap") &&
      !m.brandMentioned)
  );
}

/** Days since a mention was posted. */
function ageInDays(m: Mention): number {
  return (Date.now() - new Date(m.publishedAt).getTime()) / 86_400_000;
}

/** Higher = act on it sooner. Drives the Opportunities ranking. */
export function opportunityScore(m: Mention): number {
  let s = 0;
  if (m.signalType === "buying-decision") s += 50;
  if (m.signalType === "competitor-frustration") s += 45;
  if (m.signalType === "unanswered-question") s += 28;
  if (m.signalType === "content-gap") s += 15;
  if (m.competitors?.length) s += 30; // a named competitor = a switch in play
  if (!m.brandMentioned) s += 12; // open field — they aren't on us yet
  s += Math.min(m.engagement, 300) / 10; // reach tiebreaker
  // Recency boost — a thread from today is far more actionable than a 3-month
  // old one, and this keeps freshly collected posts near the top.
  s += Math.max(0, 45 - ageInDays(m));
  return s;
}

/** Roll a brand's mentions up into the shape the dashboard renders. */
export function summarizeBrand(
  brand: BrandId,
  all: Mention[],
  windowDays = 365,
): BrandSummary {
  const items = withinDays(
    all.filter((m) => m.brand === brand),
    windowDays,
  );
  // Source cards + counts reflect TRUE brand mentions only.
  const brandMentions = items.filter((m) => m.brandMentioned);

  const bySource = new Map<SourceId, Mention[]>();
  const sentiment = emptySentiment();
  for (const m of brandMentions) {
    sentiment[m.sentiment]++;
    const list = bySource.get(m.source) ?? [];
    list.push(m);
    bySource.set(m.source, list);
  }

  const sources: SourceSummary[] = [...bySource.entries()].map(
    ([source, list]) => {
      const s = emptySentiment();
      const sig = emptySignals();
      for (const m of list) {
        s[m.sentiment]++;
        sig[m.signalType]++;
      }
      const recent = [...list].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      return { source, total: list.length, sentiment: s, signals: sig, recent };
    },
  );
  sources.sort((a, b) => b.total - a.total);

  // Rank brand mentions by engagement, but give recent ones a lift so new
  // posts surface instead of being buried under old high-engagement threads.
  const mentionScore = (m: Mention) =>
    Math.min(m.engagement, 300) + Math.max(0, 60 - ageInDays(m) * 1.5);
  const topMentions = [...brandMentions]
    .sort((a, b) => mentionScore(b) - mentionScore(a))
    .slice(0, 25);

  // Opportunities draw from ALL items (incl. competitor-only threads).
  const opportunitiesAll = items
    .filter(isOpportunity)
    .sort((a, b) => opportunityScore(b) - opportunityScore(a));

  return {
    brand,
    total: brandMentions.length,
    windowDays,
    sentiment,
    sources,
    topMentions,
    opportunities: opportunitiesAll.slice(0, 40),
    opportunityCount: opportunitiesAll.length,
  };
}
