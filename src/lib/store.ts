import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Mention, MentionStore } from "./types";

/**
 * Dead-simple JSON-file store. Zero external services, fully free.
 *
 * The collector writes data/mentions.json; the dashboard reads it. When you
 * outgrow a file (tens of thousands of rows) this is the one module to swap
 * for Turso/Neon/Supabase — nothing else imports the filesystem.
 */
const DATA_FILE = path.join(process.cwd(), "data", "mentions.json");

export function makeMentionId(parts: {
  source: string;
  url: string;
  excerpt: string;
}): string {
  return createHash("sha1")
    .update(`${parts.source}|${parts.url}|${parts.excerpt}`)
    .digest("hex")
    .slice(0, 16);
}

export async function readStore(): Promise<MentionStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as MentionStore;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { generatedAt: new Date(0).toISOString(), mode: "live", mentions: [] };
    }
    throw err;
  }
}

export async function writeStore(store: MentionStore): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2) + "\n", "utf8");
}

/**
 * Merge freshly collected mentions into the store, de-duplicating by id and
 * dropping anything older than `retentionDays` so the file stays bounded.
 */
export async function upsertMentions(
  incoming: Mention[],
  retentionDays = 400,
): Promise<MentionStore> {
  const store = await readStore();
  const byId = new Map<string, Mention>();
  // Never carry synthetic seed data into a live collection — start clean.
  if (store.mode !== "demo") {
    for (const m of store.mentions) byId.set(m.id, m);
  }
  for (const m of incoming) byId.set(m.id, m); // newer wins

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const merged = [...byId.values()].filter(
    (m) => new Date(m.publishedAt).getTime() >= cutoff,
  );
  merged.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const next: MentionStore = {
    generatedAt: new Date().toISOString(),
    mode: "live",
    mentions: merged,
  };
  await writeStore(next);
  return next;
}
