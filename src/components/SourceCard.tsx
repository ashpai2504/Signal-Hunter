"use client";

import { SOURCE_BY_ID } from "@/lib/brands";
import type { SourceSummary } from "@/lib/aggregate";

interface Props {
  summary: SourceSummary;
  /** Brand-aware description (e.g. real subreddits for THIS brand). */
  description: string;
  accentHex: string;
  selected: boolean;
  onSelect: () => void;
}

export function SourceCard({
  summary,
  description,
  accentHex,
  selected,
  onSelect,
}: Props) {
  const meta = SOURCE_BY_ID[summary.source];
  const { positive, neutral, negative } = summary.sentiment;
  const total = summary.total || 1;
  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <button
      onClick={onSelect}
      className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-white/30 bg-white/[0.06]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
      style={selected ? { boxShadow: `inset 0 0 0 1px ${accentHex}55` } : {}}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <div className="font-semibold leading-tight">{meta.name}</div>
            <div className="text-xs text-slate-400">{description}</div>
          </div>
        </div>
        {!meta.live && (
          <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            soon
          </span>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold tabular-nums">{summary.total}</div>
          <div className="text-xs text-slate-400">mentions</div>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="bg-emerald-500" style={{ width: pct(positive) }} />
        <div className="bg-slate-500" style={{ width: pct(neutral) }} />
        <div className="bg-rose-500" style={{ width: pct(negative) }} />
      </div>
      <div className="flex gap-3 text-[11px] text-slate-400">
        <span>👍 {positive}</span>
        <span>😐 {neutral}</span>
        <span>👎 {negative}</span>
      </div>
    </button>
  );
}
