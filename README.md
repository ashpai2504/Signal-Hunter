# Signal — Internet Intelligence Dashboard

A live tracker of what the internet is saying about **Hunter Industries** and its
brands **FX Luminaire** and **Lumascape**. Toggle between brands and see, per
source (YouTube, Reddit, forums, web), how many mentions there were in the last
30 days — each with a source link, a sentiment + signal classification, and a
draft reply written in the brand's voice.

```
┌─────────────────────────────────────────────────────────────┐
│  ● Signal — Internet Intelligence      [Hunter][FX][Lumascape]│
│  142 mentions · 30d   👍 61   👎 18   4 sources               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │▶ YouTube│ │👽 Reddit│ │💬 Forums│ │🌐 Web   │   ← source cards│
│  │  38     │ │  47     │ │  22     │ │  35     │                 │
│  └────────┘ └────────┘ └────────┘ └────────┘                 │
│  Top conversations to engage today …  [✍️ Draft reply]        │
└─────────────────────────────────────────────────────────────┘
```

## Stack

- **Next.js 15 + React 19 + TypeScript + Tailwind** — the dashboard.
- **JSON file store** (`data/mentions.json`) — zero external services. Swap
  `src/lib/store.ts` for Turso/Neon/Supabase later if you outgrow a file.
- **Node collector** (`src/collector`) — queries each source, classifies with
  **Groq (Llama)**, writes the store.
- **GitHub Actions cron** — free 24/7 collection (`.github/workflows/collect.yml`).

## Quick start

```bash
npm install
npm run seed     # fill data/mentions.json with realistic MOCK data
npm run dev      # http://localhost:3000
```

That gives you the full dashboard immediately, no API keys needed.

## Going live (all data sources are free)

1. Copy `.env.example` → `.env` and fill in the keys you have. Each source is
   independent — add them one at a time.

   | Source | Key(s) | Free tier | Where |
   | --- | --- | --- | --- |
   | YouTube | `YOUTUBE_API_KEY` | 10k units/day | Google Cloud → YouTube Data API v3 |
   | Web + Forums | `GOOGLE_API_KEY`, `GOOGLE_CSE_ID` | 100 queries/day | Google Cloud + programmablesearchengine.google.com |
   | Reddit | `REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD` | 100 queries/min, non-commercial | reddit.com/prefs/apps (type: script) |
   | Classification | `GROQ_API_KEY` | generous free tier | console.groq.com |

2. Run the real collector:

   ```bash
   npm run collect
   ```

   Without keys it warns and skips that source; without Groq it falls back to a
   keyword heuristic (no auto-drafted replies).

3. **Deploy free:** push to GitHub, import the repo on Vercel. Add the same env
   vars as **GitHub repository secrets** so the cron workflow can run, and as
   **Vercel env vars** for the app. The Action refreshes `data/mentions.json`
   every 6 hours and the commit triggers a Vercel redeploy.

## Notes on data sources (June 2026)

- **Reddit** still has a free API tier (100 q/min) for low-volume non-commercial
  use — the 2023 changes only made high-volume commercial access expensive.
- **Bing Search API** was retired (Aug 2025) and **Brave** dropped its free tier
  (Feb 2026), so **Google Custom Search** is the best free web-search option.
- **Amazon / Yelp / Quora** have no viable free APIs for this use case and are
  intentionally left out of the MVP (Amazon reviews need paid scrapers; Yelp is
  for local businesses; Quora blocks scraping). Add them later via a paid
  scraping API if needed.

## Project layout

```
src/
  app/            # Next.js routes (dashboard + /api/mentions)
  components/     # Dashboard, SourceCard, MentionRow, StatsBar, badges
  lib/            # types, brand/source config, JSON store, aggregation
  collector/      # orchestrator + per-source collectors + Groq classifier
data/mentions.json
.github/workflows/collect.yml
```
