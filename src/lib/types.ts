// Core data model for Signal — the Internet Intelligence Dashboard.

/** The three Hunter Industries brands we track. */
export type BrandId = "hunter" | "fx-luminaire" | "lumascape";

/** Where a mention was found. Add new collectors here as they come online. */
export type SourceId =
  | "youtube"
  | "reddit"
  | "forums"
  | "web"
  | "news";

/**
 * The five "signal types" the classifier sorts every mention into.
 * These mirror the product brief — they tell the marketing/sales/product
 * teams *why* a conversation is worth engaging.
 */
export type SignalType =
  | "buying-decision" // someone is actively choosing a product
  | "competitor-frustration" // unhappy with a competitor (Rain Bird, etc.)
  | "unanswered-question" // a question that ranks / could rank on Google
  | "brand-mention" // direct mention of a Hunter brand/product
  | "content-gap"; // a topic nobody has good content for yet

export type Sentiment = "positive" | "neutral" | "negative";

/** A single conversation/post/comment found somewhere on the internet. */
export interface Mention {
  /** Stable id — hash of source + url + snippet, used for de-duplication. */
  id: string;
  brand: BrandId;
  source: SourceId;
  /** Short title or the first line of the post/comment. */
  title: string;
  /** A representative excerpt of the matched text. */
  excerpt: string;
  /** Direct link to the original conversation. */
  url: string;
  author?: string;
  /** Sub-source label, e.g. "r/lawncare" or a YouTube channel name. */
  context?: string;
  /** ISO date the content was published. */
  publishedAt: string;
  /** ISO date we collected it. */
  collectedAt: string;
  signalType: SignalType;
  sentiment: Sentiment;
  /** Engagement proxy (upvotes, likes, replies) — used for ranking. */
  engagement: number;
  /** Competitor brands named in the conversation (Rain Bird, Toro, Kichler…). */
  competitors?: string[];
  /** Product names detected in the text (Hydrawise, PGP…). One post = one
   *  mention; products are tags on it, never duplicate rows. */
  products?: string[];
  /** Conversation themes — a post can belong to several at once. */
  themes?: string[];
  /** Whether the text actually named our brand (vs. a competitor-only thread). */
  brandMentioned: boolean;
  /** A draft reply written in Hunter's voice, ready for review. */
  draftResponse?: string;
}

/** The full dataset persisted to disk and served to the dashboard. */
export interface MentionStore {
  generatedAt: string;
  /** "demo" = synthetic seed data (placeholder links); "live" = real collected. */
  mode: "demo" | "live";
  mentions: Mention[];
}
