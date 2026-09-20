# ConnectHub

Public community board for text, full-bleed images/video, YouTube Shorts (in-app), and music feeds — Friendly Cards UI with nested comments, votes, likes, friends, chat, and bookmarks.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login usernames: `you`, `maya_waves`, `nova_beats`, `jordan_ink`.

## Optional live YouTube ingest

Set an API key so `POST /api/youtube/sync` pulls real Shorts metadata:

```env
YOUTUBE_API_KEY=your_key_here
```

Without a key, curated Shorts + known-artist music posts are used. External URLs are stripped from post bodies; players use `youtube-nocookie` embeds with modest branding and CSS masks so users stay on ConnectHub.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Feed (chronological / trending / topic) |
| `/profile` | Your posts + account settings |
| `/topics` | Topic explorer |
| `/analytics` | Weekly trending reports |
| `/bookmarks` | Saved posts |
| `/guidelines` | Community rules |
| `/top-creators` | Popular creators |
| `/friends` `/suggestions` `/following` | Social graph |
| `/login` | Demo auth |
| `/chat` | Peer + group chat |
| `/notifications` | Alerts |
| `/users/[id]` | Public profiles (private profiles locked) |

## Retention design

- No outbound YouTube/link CTAs in the UI
- Media is full-width on phones
- Rich details panels (artist, album, views, tags, etc.) plus fields queued for future fetch
