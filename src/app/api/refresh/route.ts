import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/refresh — kick off a collection run right now.
 *
 * Triggers the "Collect mentions" GitHub Actions workflow via
 * workflow_dispatch. The run scrapes all sources, commits fresh data, and the
 * dashboard picks it up within a minute of the commit (no redeploy needed —
 * /api/mentions reads the repo's raw file). End to end: ~3–5 minutes.
 *
 * Requires a GITHUB_TOKEN env var (fine-grained PAT with Actions: Read & write
 * on the repo) — same token the Settings panel uses for saving config.
 */
export async function POST() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "ashpai2504/Signal-Hunter";
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Refresh needs a GITHUB_TOKEN env var on the deployment (fine-grained PAT with Actions + Contents write). Data still auto-refreshes every 6 hours.",
      },
      { status: 501 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/collect.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (res.status !== 204) {
    const body = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `GitHub refused the trigger (HTTP ${res.status}). ${body.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    note: "Collection started — fresh mentions land in about 3–5 minutes.",
  });
}
