import type { BrandId, SignalType, SourceId } from "./types";

export interface BrandConfig {
  id: BrandId;
  name: string;
  /** Short label for compact UI. */
  shortName: string;
  /** Tailwind text/border accent class root, plus a raw hex for inline styles. */
  accent: string;
  hex: string;
  tagline: string;
  /** What the brand makes, used for context in search + the "where" labels. */
  category: "irrigation" | "landscape-lighting" | "architectural-lighting";
  /**
   * Search terms the collectors use to find mentions for this brand.
   * Keep these tight to avoid false positives (e.g. "Hunter" alone is noisy).
   */
  keywords: string[];
  /**
   * Competing brands. Used to (a) find competitor-comparison threads and
   * (b) flag opportunities — conversations where we can win someone over.
   */
  competitors: string[];
  /** Where this brand is actually discussed — drives collectors AND the UI. */
  channels: {
    /** Subreddits the Reddit collector searches for THIS brand. */
    subreddits: string[];
    /** Trade forums / communities the web search leans on for THIS brand. */
    forums: string[];
    /** Generic "buyers ask here" descriptor for the Web card. */
    web: string;
  };
}

export const BRANDS: BrandConfig[] = [
  {
    id: "hunter",
    name: "Hunter Industries",
    shortName: "Hunter",
    accent: "hunter",
    hex: "#00843D",
    tagline: "Irrigation & outdoor products",
    category: "irrigation",
    keywords: [
      "Hunter Industries",
      "Hunter irrigation",
      "Hunter sprinkler",
      "Hunter Pro-C",
      "Hunter PGV",
      "Hunter MP Rotator",
      "Hunter Hydrawise",
      "Hunter X-Core",
      "Hunter PGP",
    ],
    competitors: [
      "Rain Bird",
      "Rainbird",
      "Toro",
      "Orbit",
      "Rachio",
      "Irritrol",
      "Weathermatic",
      "Hunter vs Rain Bird",
    ],
    channels: {
      subreddits: [
        "lawncare",
        "landscaping",
        "irrigation",
        "homeimprovement",
        "DIY",
        "homeowners",
        "gardening",
        "vegetablegardening",
        "golf",
        "sprinklers",
      ],
      forums: ["LawnSite.com", "Green Industry Pros", "IrrigationCraft"],
      web: "Blogs, Q&A and contractor sites",
    },
  },
  {
    id: "fx-luminaire",
    name: "FX Luminaire",
    shortName: "FX Luminaire",
    accent: "fx",
    hex: "#C8A24B",
    tagline: "Landscape & architectural lighting",
    category: "landscape-lighting",
    keywords: [
      "FX Luminaire",
      "FX Luminaire lighting",
      "FX landscape lighting",
      "Luxor lighting controller",
      "FX Luxor",
      "FX LED landscape light",
    ],
    competitors: [
      "Kichler",
      "Volt Lighting",
      "VOLT",
      "WAC Landscape",
      "Vista Professional",
      "Unique Lighting",
      "Hunza",
      "Coastal Source",
      "Brilliance LED",
    ],
    channels: {
      subreddits: [
        "landscapelighting",
        "landscaping",
        "lighting",
        "lightingdesign",
        "electricians",
        "HomeImprovement",
        "DIY",
        "homeowners",
        "pools",
      ],
      forums: ["Houzz", "Green Industry Pros", "LandscapeLightingForum"],
      web: "Houzz, design blogs & lighting Q&A",
    },
  },
  {
    id: "lumascape",
    name: "Lumascape",
    shortName: "Lumascape",
    accent: "lumascape",
    hex: "#1F6FEB",
    tagline: "Architectural & specification lighting",
    category: "architectural-lighting",
    keywords: [
      "Lumascape",
      "Lumascape lighting",
      "Lumascape fixture",
      "Lumascape in-grade",
      "Lumascape facade",
    ],
    competitors: [
      "BEGA",
      "Lumenpulse",
      "ERCO",
      "WE-EF",
      "Hydrel",
      "Hess",
      "Lumenbeam",
    ],
    channels: {
      subreddits: [
        "lighting",
        "lightingdesign",
        "architecture",
        "electricians",
        "HomeImprovement",
        "DIY",
      ],
      forums: [
        "Architectural Lighting Forum",
        "Green Industry Pros",
        "LinkedIn",
      ],
      web: "Spec sheets, case studies & design forums",
    },
  },
];

/**
 * Topic / intent keywords — what people actually ASK about, even when they
 * don't name a brand. These drive the bulk of opportunities for a marketing
 * team: a "sprinkler system not working" thread is a chance to step in first.
 * Grouped by category; attached to a brand via `brandTopics()`.
 */
export const IRRIGATION_TOPICS: string[] = [
  "sprinkler system not working",
  "sprinkler zone not turning on",
  "how to design irrigation system",
  "sprinkler head spacing",
  "controller programming help",
  "irrigation wiring troubleshooting",
  "rain sensor not working",
  "low water pressure sprinkler",
  "sprinkler head not popping up",
  "leaking valve box",
  "irrigation valve solenoid not working",
  "sprinkler system short cycling",
  "irrigation valve stuck open",
  "sprinkler zone won't shut off",
  "backflow preventer leaking",
  "winterize sprinkler system",
  "blow out irrigation lines",
  "spring sprinkler startup",
  "smart irrigation controller",
  "weather based irrigation",
  "wifi sprinkler controller",
  "drip irrigation setup",
];

export const LIGHTING_TOPICS: string[] = [
  "low voltage landscape lighting",
  "outdoor lighting transformer help",
  "bury landscape lighting wire",
  "how deep to bury lighting cable",
  "daisy chain vs hub landscape lighting",
  "voltage drop landscape lighting",
  "flickering landscape lights",
  "landscape lights dim",
  "landscape lighting transformer overheating",
  "LED outdoor lights not working",
  "water in landscape light fixture",
  "uplighting trees ideas",
  "front yard lighting design",
  "pathway lighting spacing",
  "best color temperature for outdoor lighting",
  "2700k vs 3000k landscape lighting",
  "glare free landscape lighting",
  "best landscape lighting brand",
  "professional vs big box landscape lighting",
  "commercial grade landscape lighting",
];

/** The topic keyword set that applies to a brand, based on its category. */
export function brandTopics(brand: BrandConfig): string[] {
  return brand.category === "irrigation" ? IRRIGATION_TOPICS : LIGHTING_TOPICS;
}

export const BRAND_BY_ID: Record<BrandId, BrandConfig> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
) as Record<BrandId, BrandConfig>;

export interface SourceConfig {
  id: SourceId;
  name: string;
  /** Emoji used as a lightweight icon in the cards. */
  icon: string;
  /** Whether a real collector is wired up yet (vs. seeded/mock only). */
  live: boolean;
  description: string;
}

export const SOURCES: SourceConfig[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    live: true,
    description: "Comments on irrigation & lighting videos",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "👽",
    live: true,
    description: "r/lawncare, r/landscaping, r/irrigation, r/golf",
  },
  {
    id: "forums",
    name: "Forums",
    icon: "💬",
    live: true,
    description: "LawnSite, Green Industry Pros & trade forums",
  },
  {
    id: "web",
    name: "Web & Blogs",
    icon: "🌐",
    live: true,
    description: "Blogs, Q&A and general web mentions",
  },
  {
    id: "news",
    name: "News",
    icon: "📰",
    live: true,
    description: "Press & industry news coverage",
  },
];

export const SOURCE_BY_ID: Record<SourceId, SourceConfig> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
) as Record<SourceId, SourceConfig>;

/**
 * Brand-aware description for a source card. The Reddit card for a lighting
 * brand should NOT say "r/lawncare" — this returns the channels that actually
 * apply to the given brand.
 */
export function sourceBlurb(brand: BrandConfig, source: SourceId): string {
  switch (source) {
    case "reddit":
      return brand.channels.subreddits
        .slice(0, 4)
        .map((s) => `r/${s}`)
        .join(", ");
    case "forums":
      return brand.channels.forums.join(", ");
    case "web":
      return brand.channels.web;
    case "youtube":
      return brand.category === "irrigation"
        ? "Comments on irrigation & install videos"
        : "Comments on landscape & lighting videos";
    default:
      return SOURCE_BY_ID[source].description;
  }
}

export interface SignalMeta {
  id: SignalType;
  label: string;
  /** Tailwind classes for the badge. */
  badge: string;
  blurb: string;
}

export const SIGNALS: SignalMeta[] = [
  {
    id: "buying-decision",
    label: "Buying decision",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    blurb: "Someone is actively choosing a product right now.",
  },
  {
    id: "competitor-frustration",
    label: "Competitor frustration",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    blurb: "Unhappy with Rain Bird or another competitor.",
  },
  {
    id: "unanswered-question",
    label: "Unanswered question",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    blurb: "A question that ranks (or could rank) on Google.",
  },
  {
    id: "brand-mention",
    label: "Brand mention",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    blurb: "A direct mention of a Hunter brand or product.",
  },
  {
    id: "content-gap",
    label: "Content gap",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    blurb: "A topic nobody has good content for yet.",
  },
];

export const SIGNAL_BY_ID: Record<SignalType, SignalMeta> = Object.fromEntries(
  SIGNALS.map((s) => [s.id, s]),
) as Record<SignalType, SignalMeta>;
