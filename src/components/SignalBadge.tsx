import { SIGNAL_BY_ID } from "@/lib/brands";
import type { SignalType } from "@/lib/types";

export function SignalBadge({ type }: { type: SignalType }) {
  const meta = SIGNAL_BY_ID[type];
  return (
    <span
      title={meta.blurb}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-300",
  neutral: "bg-slate-500/15 text-slate-300",
  negative: "bg-rose-500/15 text-rose-300",
};

export function SentimentDot({ sentiment }: { sentiment: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral}`}
    >
      {sentiment}
    </span>
  );
}
