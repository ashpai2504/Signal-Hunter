import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { summarizeBrand } from "@/lib/aggregate";
import { BRANDS } from "@/lib/brands";

// Always read the file fresh — the collector updates it out of band.
export const dynamic = "force-dynamic";

/**
 * GET /api/mentions?brand=hunter&days=30
 * Returns the per-brand summary the dashboard renders.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandParam = searchParams.get("brand");
  const days = Number(searchParams.get("days") ?? "365") || 365;

  const store = await readStore();

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
