import { NextResponse } from "next/server";
import { syncMusicFeed, syncYoutubeShorts, listMusicCatalog } from "@/lib/youtube";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const limit = Number(body.limit || 5);
  const shorts = await syncYoutubeShorts(limit);
  const music = syncMusicFeed();
  return NextResponse.json({
    shorts,
    music,
    message:
      shorts.source === "youtube-api"
        ? "Live YouTube Shorts imported into public feed"
        : "Curated Shorts + music feed refreshed (set YOUTUBE_API_KEY for live ingest)",
  });
}

export async function GET() {
  return NextResponse.json({
    musicCatalog: listMusicCatalog(),
    hint: "POST /api/youtube/sync to ingest shorts into the public feed",
  });
}
