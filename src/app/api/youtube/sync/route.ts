import { NextResponse } from "next/server";
import { syncMusicFeed, syncYoutubeShorts, listMusicCatalog, runDailyIngest } from "@/lib/youtube";
import { ensureDailyCron } from "@/lib/cron";
import { getCurrentUserId, getSettings, isAdmin } from "@/lib/db";

ensureDailyCron();

export async function POST(req: Request) {
  const me = await getCurrentUserId();
  if (!(await isAdmin(me))) {
    return NextResponse.json(
      { error: "Admin only — YouTube RSS ingest publishes as the public service account" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode || "youtube";
  const limit = Number(body.limit || 5);

  if (mode === "daily" || mode === "all") {
    const music = await syncMusicFeed();
    const ingest = await runDailyIngest({ youtubeLimit: limit, rssLimit: limit });
    return NextResponse.json({
      ingest,
      music,
      message: `Daily curation ran — imported ${ingest.totalImported} items across ${ingest.groups.length} groups`,
      groups: ingest.groups,
    });
  }

  const shorts = await syncYoutubeShorts(limit);
  const music =
    body.includeMusic === false ? { imported: 0, posts: [] } : await syncMusicFeed();
  return NextResponse.json({
    shorts,
    music,
    message:
      shorts.source === "youtube-rss"
        ? "YouTube channel RSS uploads published as public service posts (duplicates skipped)"
        : "RSS unavailable — curated fallback used. Still no outbound YouTube links.",
  });
}

export async function GET() {
  ensureDailyCron();
  const settings = await getSettings();
  return NextResponse.json({
    musicCatalog: listMusicCatalog(),
    settings,
    hint: "POST as admin with { mode: 'daily' } for full multi-source ingest, or default YouTube RSS + music",
  });
}
