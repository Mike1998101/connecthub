# ConnectHub

Public community board for shorts, music, curated tech, and nested discussion — Friendly Cards UI, in-app media (no outbound YouTube hops).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What you get

- **Public feed** (visibility default: public) — chronological / trending / topic / source-group filters
- **YouTube channel RSS ingest** (no API key) — admin-only; posts as `ConnectHub Curator` service account; duplicates skipped
- **Daily multi-source curation** — TechCrunch, The Verge, Wired, Gizmodo, Dev.to, Hacker News API, Reddit hot JSON, GitHub trending, music catalog
- **Schedule** — `/settings` sets `dailyIngestHour` (0–23) and app visibility
- **Similar posts** — cluster/topic/tag matching when you open a card
- **Social** — follow, friend request → approve/decline, message requests, group chat add/remove members
- **Profile** — posts, comments, following tabs; public profiles support follow + add friend

## Admin actions

- Sidebar **Run daily curation** or `POST /api/settings` `{ "action": "run_now" }`
- `POST /api/youtube/sync` `{ "mode": "daily" }` (admin session required)

Logged-in demo user is **You** (`u5`, admin).
