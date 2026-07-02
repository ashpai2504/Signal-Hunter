import { NextResponse } from "next/server";
import { BRANDS } from "@/lib/brands";
import {
  applyTracking,
  loadTrackingConfig,
  saveTrackingConfigLocal,
  type BrandTracking,
  type TrackingConfig,
} from "@/lib/config";
import type { BrandId } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET  /api/config — effective tracking lists per brand (defaults + overrides).
 * POST /api/config — save one brand's lists. Body:
 *   { brand: "hunter", tracking: { products: [...], subreddits: [...], competitors: [...], keywords: [...] } }
 *
 * Persistence: locally we write data/config.json. On Vercel the filesystem is
 * ephemeral, so if GITHUB_TOKEN is set we commit data/config.json to the repo —
 * the next scheduled collection run (and redeploy) picks it up automatically.
 */
export async function GET() {
  const cfg = await loadTrackingConfig();
  const brands = BRANDS.map((b) => {
    const eff = applyTracking(b, cfg);
    return {
      id: b.id,
      name: b.name,
      keywords: eff.keywords,
      products: eff.products,
      subreddits: eff.channels.subreddits,
      competitors: eff.competitors,
    };
  });
  return NextResponse.json({ updatedAt: cfg.updatedAt, brands });
}

const FIELDS: (keyof BrandTracking)[] = [
  "keywords",
  "products",
  "subreddits",
  "competitors",
];

function sanitize(tracking: unknown): BrandTracking | null {
  if (typeof tracking !== "object" || tracking === null) return null;
  const t = tracking as Record<string, unknown>;
  const out: BrandTracking = {};
  for (const f of FIELDS) {
    const v = t[f];
    if (v === undefined) continue;
    if (!Array.isArray(v)) return null;
    const list = v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x.length > 0 && x.length <= 80)
      .slice(0, 100);
    out[f] = [...new Set(list)];
  }
  return out;
}

async function commitToGitHub(cfg: TrackingConfig): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const repo = process.env.GITHUB_REPO ?? "ashpai2504/Signal-Hunter";
  const api = `https://api.github.com/repos/${repo}/contents/data/config.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // Need the current file SHA to update (absent if file doesn't exist yet).
  let sha: string | undefined;
  const cur = await fetch(api, { headers });
  if (cur.ok) sha = ((await cur.json()) as { sha?: string }).sha;

  const res = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `config: update tracking lists (${new Date().toISOString().slice(0, 16)}Z)`,
      content: Buffer.from(JSON.stringify(cfg, null, 2) + "\n").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });
  return res.ok;
}

export async function POST(request: Request) {
  let body: { brand?: string; tracking?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brand = BRANDS.find((b) => b.id === body.brand);
  const tracking = sanitize(body.tracking);
  if (!brand || !tracking) {
    return NextResponse.json({ error: "Invalid brand or tracking lists" }, { status: 400 });
  }

  const cfg = await loadTrackingConfig();
  cfg.brands[brand.id as BrandId] = {
    ...cfg.brands[brand.id as BrandId],
    ...tracking,
  };
  cfg.updatedAt = new Date().toISOString();

  let persisted: "github" | "local" | "none" = "none";
  if (await commitToGitHub(cfg)) {
    persisted = "github";
  }
  try {
    await saveTrackingConfigLocal(cfg);
    if (persisted === "none") persisted = "local";
  } catch {
    // Read-only filesystem (Vercel) — fine if the GitHub commit succeeded.
  }

  if (persisted === "none") {
    return NextResponse.json(
      {
        error:
          "Could not persist: set a GITHUB_TOKEN env var on the deployment so settings can be saved to the repo.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    persisted,
    note:
      persisted === "github"
        ? "Saved to the repo — new sources are used on the next scheduled collection run (within ~6h)."
        : "Saved locally — run `npm run collect` to use the new sources.",
  });
}
