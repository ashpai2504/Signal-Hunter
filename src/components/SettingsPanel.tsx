"use client";

import { useEffect, useState } from "react";
import type { BrandId } from "@/lib/types";

interface BrandLists {
  id: BrandId;
  name: string;
  keywords: string[];
  products: string[];
  subreddits: string[];
  competitors: string[];
}

type ListField = "products" | "subreddits" | "competitors" | "keywords";

const FIELD_META: { field: ListField; label: string; hint: string }[] = [
  {
    field: "products",
    label: "Products tracked",
    hint: "Matching ignores hyphens/spaces/case — “Rainclik” finds “Rain-Clik”.",
  },
  {
    field: "subreddits",
    label: "Subreddits searched",
    hint: "Name only, no r/ prefix (e.g. Irrigation).",
  },
  {
    field: "competitors",
    label: "Competitors",
    hint: "Used for opportunities and share of conversation.",
  },
  {
    field: "keywords",
    label: "Brand search phrases",
    hint: "Exact phrases searched on Reddit (e.g. “Hunter sprinkler”).",
  },
];

/** Chip-list editor with an add box — no code knowledge needed. */
function ChipEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim().replace(/^r\//i, "");
    if (!v || items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span className="text-[11px] text-slate-500">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
        {items.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 rounded-md bg-white/[0.07] px-2 py-1 text-xs text-slate-200"
          >
            {item}
            <button
              onClick={() => onChange(items.filter((x) => x !== item))}
              className="ml-0.5 text-slate-500 hover:text-rose-400"
              title={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          onBlur={add}
          placeholder="+ add and press Enter"
          className="min-w-[150px] flex-1 bg-transparent px-1 py-1 text-xs text-slate-200 placeholder-slate-600 outline-none"
        />
      </div>
    </div>
  );
}

export function SettingsPanel({
  brand,
  onClose,
}: {
  brand: BrandId;
  onClose: () => void;
}) {
  const [lists, setLists] = useState<BrandLists | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((json: { brands: BrandLists[] }) =>
        setLists(json.brands.find((b) => b.id === brand) ?? null),
      )
      .catch(() => setStatus("Failed to load settings."));
  }, [brand]);

  async function save() {
    if (!lists) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: lists.id,
          tracking: {
            products: lists.products,
            subreddits: lists.subreddits,
            competitors: lists.competitors,
            keywords: lists.keywords,
          },
        }),
      });
      const json = (await res.json()) as { note?: string; error?: string };
      setStatus(res.ok ? `✓ ${json.note}` : `✗ ${json.error}`);
    } catch {
      setStatus("✗ Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#10151d] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Tracking settings</h2>
            <p className="text-xs text-slate-400">
              {lists?.name ?? "…"} — add or remove what Signal looks for. Changes
              apply on the next collection run.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-white/15 px-2.5 py-1 text-sm text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        {!lists ? (
          <p className="py-8 text-center text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-5">
            {FIELD_META.map(({ field, label, hint }) => (
              <ChipEditor
                key={field}
                label={label}
                hint={hint}
                items={lists[field]}
                onChange={(next) => setLists({ ...lists, [field]: next })}
              />
            ))}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              {status && (
                <span
                  className={`text-xs ${status.startsWith("✓") ? "text-emerald-300" : "text-rose-300"}`}
                >
                  {status}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
