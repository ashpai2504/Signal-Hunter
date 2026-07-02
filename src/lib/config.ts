import { promises as fs } from "node:fs";
import path from "node:path";
import { BRANDS, type BrandConfig } from "./brands";
import type { BrandId } from "./types";

/**
 * Editable tracking config — lets non-technical users add/remove products,
 * subreddits, competitors, and keywords from the dashboard Settings panel
 * without touching code.
 *
 * data/config.json stores per-brand overrides. Anything not overridden falls
 * back to the defaults in brands.ts. The collector merges this at startup, so
 * additions take effect on the next scheduled run.
 */
export interface BrandTracking {
  keywords?: string[];
  products?: string[];
  subreddits?: string[];
  competitors?: string[];
}

export interface TrackingConfig {
  updatedAt: string;
  brands: Partial<Record<BrandId, BrandTracking>>;
}

const CONFIG_FILE = path.join(process.cwd(), "data", "config.json");

export async function loadTrackingConfig(): Promise<TrackingConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(raw) as TrackingConfig;
  } catch {
    return { updatedAt: new Date(0).toISOString(), brands: {} };
  }
}

export async function saveTrackingConfigLocal(
  cfg: TrackingConfig,
): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/** A brand's config with any user overrides applied. */
export function applyTracking(
  brand: BrandConfig,
  cfg: TrackingConfig,
): BrandConfig {
  const o = cfg.brands[brand.id];
  if (!o) return brand;
  return {
    ...brand,
    keywords: o.keywords?.length ? o.keywords : brand.keywords,
    products: o.products?.length ? o.products : brand.products,
    competitors: o.competitors?.length ? o.competitors : brand.competitors,
    channels: {
      ...brand.channels,
      subreddits: o.subreddits?.length
        ? o.subreddits
        : brand.channels.subreddits,
    },
  };
}

/** All brands with overrides applied — what the collector iterates. */
export async function effectiveBrands(): Promise<BrandConfig[]> {
  const cfg = await loadTrackingConfig();
  return BRANDS.map((b) => applyTracking(b, cfg));
}
