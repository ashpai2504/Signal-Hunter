"use client";

import { SIGNALS } from "@/lib/brands";
import type { BrandSummary } from "@/lib/aggregate";

function windowLabel(days: number): string {
  if (days >= 360) return "12 mo";
  if (days >= 60) return `${Math.round(days / 30)} mo`;
  return `${days}d`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

interface StatsBarProps {
  summary: BrandSummary;
  onSelectMentions: () => void;
  onSelectOpportunities: () => void;
}

export function StatsBar({
  summary,
  onSelectMentions,
  onSelectOpportunities,
}: StatsBarProps) {
  const { sentiment } = summary;
  const signalCounts = SIGNALS.map((s) => ({
    meta: s,
    count: summary.sources.reduce((n, src) => n + src.signals[s.id], 0),
  }));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* Clickable — jumps to the mentions list. */}
      <button
        onClick={onSelectMentions}
        className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.05]"
      >
        <div className="text-2xl font-bold tabular-nums">{summary.total}</div>
        <div className="text-xs text-slate-400">
          mentions · last {windowLabel(summary.windowDays)} →
        </div>
      </button>
      {/* Clickable — jumps to the opportunities list. */}
      <button
        onClick={onSelectOpportunities}
        className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-left transition-colors hover:border-amber-400/60 hover:bg-amber-400/[0.12]"
      >
        <div className="text-2xl font-bold tabular-nums text-amber-300">
          {summary.opportunityCount}
        </div>
        <div className="text-xs text-amber-200/70">🎯 opportunities →</div>
      </button>
      <Stat label="positive" value={sentiment.positive} />
      <Stat label="negative" value={sentiment.negative} />
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="text-xs text-slate-400">top signal</div>
        <div className="mt-1 text-sm font-semibold">
          {signalCounts.sort((a, b) => b.count - a.count)[0]?.meta.label ?? "—"}
        </div>
      </div>
    </div>
  );
}
