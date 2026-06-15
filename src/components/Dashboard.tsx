"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BRANDS, sourceBlurb } from "@/lib/brands";
import type { BrandId, SourceId } from "@/lib/types";
import type { BrandSummary } from "@/lib/aggregate";
import { SourceCard } from "./SourceCard";
import { MentionRow } from "./MentionRow";
import { StatsBar } from "./StatsBar";

interface ApiResponse {
  generatedAt: string;
  mode: "demo" | "live";
  windowDays: number;
  summaries: BrandSummary[];
}

export function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandId>("hunter");
  const [source, setSource] = useState<SourceId | null>(null);
  const [view, setView] = useState<"opportunities" | "top">("opportunities");
  const listRef = useRef<HTMLDivElement>(null);

  function showList(next: "opportunities" | "top") {
    setSource(null);
    setView(next);
    // Let the state apply, then scroll the list into view.
    requestAnimationFrame(() =>
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  useEffect(() => {
    let active = true;
    fetch("/api/mentions")
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((json: ApiResponse) => {
        if (active) setData(json);
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const brandConfig = BRANDS.find((b) => b.id === brand)!;
  const summary = useMemo(
    () => data?.summaries.find((s) => s.brand === brand),
    [data, brand],
  );

  // Mentions to show: a selected source's list, or the chosen view.
  const mentions = useMemo(() => {
    if (!summary) return [];
    if (source) {
      return summary.sources.find((s) => s.source === source)?.recent ?? [];
    }
    return view === "opportunities" ? summary.opportunities : summary.topMentions;
  }, [summary, source, view]);

  const updated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString()
    : "—";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span
              className="inline-block h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ background: brandConfig.hex }}
            />
            Signal
            <span className="text-slate-500">— Internet Intelligence</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            What the internet is saying about Hunter Industries brands · updated{" "}
            {updated}
          </p>
        </div>

        {/* Brand toggle */}
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          {BRANDS.map((b) => {
            const isActive = b.id === brand;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setBrand(b.id);
                  setSource(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "text-slate-900" : "text-slate-300 hover:text-white"
                }`}
                style={isActive ? { background: b.hex } : {}}
                title={b.tagline}
              >
                {b.shortName}
              </button>
            );
          })}
        </div>
      </header>

      {data?.mode === "demo" && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200">
          <span className="font-semibold">⚠️ Sample data</span>
          <span className="text-amber-200/80">
            These are placeholder mentions — the links don&apos;t point to real
            threads. Run{" "}
            <code className="rounded bg-black/30 px-1">npm run collect</code> for
            real, clickable sources (Google News works with no API key).
          </span>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-slate-400">Loading signal…</div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          Failed to load: {error}
        </div>
      )}

      {summary && !loading && (
        <>
          <section className="mb-6">
            <StatsBar
              summary={summary}
              onSelectMentions={() => showList("top")}
              onSelectOpportunities={() => showList("opportunities")}
            />
          </section>

          {/* Source cards */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Sources tracked
              </h2>
              {source && (
                <button
                  onClick={() => setSource(null)}
                  className="text-xs text-sky-400 hover:underline"
                >
                  ← Back to top conversations
                </button>
              )}
            </div>
            {summary.sources.length === 0 ? (
              <p className="text-slate-500">
                No mentions yet for {brandConfig.name}. Run the collector or seed
                mock data.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.sources.map((s) => (
                  <SourceCard
                    key={s.source}
                    summary={s}
                    description={sourceBlurb(brandConfig, s.source)}
                    accentHex={brandConfig.hex}
                    selected={source === s.source}
                    onSelect={() =>
                      setSource((cur) => (cur === s.source ? null : s.source))
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* Mentions / Opportunities list */}
          <section ref={listRef}>
            {source ? (
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Mentions on {source}
              </h2>
            ) : (
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
                  <button
                    onClick={() => setView("opportunities")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      view === "opportunities"
                        ? "bg-amber-400/20 text-amber-200"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    🎯 Opportunities
                  </button>
                  <button
                    onClick={() => setView("top")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      view === "top"
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Top mentions
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {view === "opportunities"
                    ? "Buying decisions & competitor threads — reach them first and win the customer."
                    : "Highest-engagement conversations that name the brand."}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {mentions.length === 0 ? (
                <p className="text-slate-500">No conversations in this view.</p>
              ) : (
                mentions.map((m) => <MentionRow key={m.id} mention={m} />)
              )}
            </div>
          </section>
        </>
      )}

      <footer className="mt-12 border-t border-white/10 pt-4 text-xs text-slate-500">
        Signal · cost-efficient brand monitoring · data refreshes via scheduled
        collector
      </footer>
    </main>
  );
}
