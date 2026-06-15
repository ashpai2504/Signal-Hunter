"use client";

import { useState } from "react";
import { SOURCE_BY_ID } from "@/lib/brands";
import type { Mention } from "@/lib/types";
import { SignalBadge, SentimentDot } from "./SignalBadge";

function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function MentionRow({ mention }: { mention: Mention }) {
  const [open, setOpen] = useState(false);
  const meta = SOURCE_BY_ID[mention.source];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>{meta.icon}</span>
        <span className="font-medium text-slate-300">{mention.context}</span>
        <span>·</span>
        <span>{mention.author}</span>
        <span>·</span>
        <span>{timeAgo(mention.publishedAt)}</span>
        <span className="ml-auto flex items-center gap-2">
          {!mention.brandMentioned && (
            <span
              title="Our brand isn't mentioned yet — open field to step in"
              className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
            >
              open field
            </span>
          )}
          <SentimentDot sentiment={mention.sentiment} />
          <SignalBadge type={mention.signalType} />
        </span>
      </div>

      {mention.competitors && mention.competitors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500">vs</span>
          {mention.competitors.map((c) => (
            <span
              key={c}
              className="rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-300"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <a
        href={mention.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block font-semibold text-slate-100 hover:text-white hover:underline"
      >
        {mention.title}
      </a>
      <p className="mt-1 text-sm text-slate-400">{mention.excerpt}</p>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="text-slate-500">▲ {mention.engagement} engagement</span>
        <a
          href={mention.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline"
        >
          View source ↗
        </a>
        {mention.draftResponse && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto rounded-md border border-white/15 px-2 py-1 font-medium text-slate-200 hover:bg-white/5"
          >
            {open ? "Hide draft reply" : "✍️ Draft reply"}
          </button>
        )}
      </div>

      {open && mention.draftResponse && (
        <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            Draft reply · Hunter voice
          </div>
          <p className="text-sm text-slate-200">{mention.draftResponse}</p>
        </div>
      )}
    </div>
  );
}
