"use client";

import type { VoiceShare, NamedCount } from "@/lib/aggregate";

/** Distinct bar colors: our brand gets the accent, competitors get a ramp. */
const COMPETITOR_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#a78bfa",
  "#f472b6",
  "#94a3b8",
  "#5eead4",
];

interface Props {
  share: VoiceShare[];
  productCounts: NamedCount[];
  accentHex: string;
}

/**
 * "Share of conversation" — of every post collected in the last 30 days, how
 * many named us vs each competitor. A post naming two brands counts for both.
 */
export function ShareOfVoice({ share, productCounts, accentHex }: Props) {
  if (share.length === 0) return null;
  let compIdx = 0;
  const colored = share.map((s) => ({
    ...s,
    color: s.isOurs ? accentHex : COMPETITOR_COLORS[compIdx++ % COMPETITOR_COLORS.length],
  }));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Share of conversation */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Share of conversation
          </h3>
          <span className="text-[11px] text-slate-500">last 30 days</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
          {colored.map((s) => (
            <div
              key={s.name}
              title={`${s.name}: ${s.count} (${s.pct}%)`}
              style={{ width: `${Math.max(s.pct, 2)}%`, background: s.color }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {colored.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: s.color }}
              />
              <span className={s.isOurs ? "font-semibold text-white" : "text-slate-300"}>
                {s.name}
              </span>
              <span className="text-slate-500">
                {s.count} · {s.pct}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Products discussed */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Products discussed
          </h3>
          <span className="text-[11px] text-slate-500">
            last 12 mo · one post can name several
          </span>
        </div>
        {productCounts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tracked products detected yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {productCounts.slice(0, 16).map((p) => (
              <span
                key={p.name}
                className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
              >
                {p.name}
                <span className="ml-1.5 font-semibold text-emerald-300">
                  {p.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
