import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { summarizeBrand } from "@/lib/aggregate";
import { BRANDS } from "@/lib/brands";
import type { MentionStore } from "@/lib/types";

// Always read the file fresh — the collector updates it out of band.
export const dynamic = "force-dynamic";

/**
 * Freshest available store. The scheduled collector commits data to GitHub,
 * so on the deployed site we read the repo's raw file (cached ~60s) — new
 * data appears within a minute of a collection run, NO redeploy needed.
 * Falls back to the locally bundled file (dev, or GitHub unreachable),
 * whichever is newer.
 */
async function readFreshestStore(): Promise<MentionStore> {
  const local = await readStore();
  const repo = process.env.GITHUB_REPO ?? "ashpai2504/Signal-Hunter";
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${repo}/main/data/mentions.json`,
      { next: { revalidate: 60 } },
    );
    if (res.ok) {
      const remote = (await res.json()) as MentionStore;
      if (
        remote?.generatedAt &&
        new Date(remote.generatedAt) > new Date(local.generatedAt)
      ) {
        return remote;
      }
    }
  } catch {
    // Offline / rate-limited — the bundled file still serves.
  }
  return local;
}

/**
 * GET /api/mentions?brand=hunter&days=30
 * Returns the per-brand summary the dashboard renders.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandParam = searchParams.get("brand");
  const days = Number(searchParams.get("days") ?? "365") || 365;

  const store = await readFreshestStore();

  const summaries = BRANDS.map((b) =>
    summarizeBrand(b.id, store.mentions, days),
  );

  const filtered = brandParam
    ? summaries.filter((s) => s.brand === brandParam)
    : summaries;

  return NextResponse.json({
    generatedAt: store.generatedAt,
    mode: store.mode,
    windowDays: days,
    summaries: filtered,
  });
}
