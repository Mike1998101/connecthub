import { NextResponse } from "next/server";
import { getState, isAdmin, mutate } from "@/lib/store";
import { ensureDailyCron, updateIngestSchedule } from "@/lib/cron";
import { runDailyIngest } from "@/lib/scrapers";
import type { SourcePlatform } from "@/lib/types";

ensureDailyCron();

export async function GET() {
  const s = getState();
  const groups = Array.from(
    new Set(s.posts.map((p) => p.sourceGroup).filter(Boolean) as string[])
  );
  const byPlatform: Record<string, number> = {};
  for (const p of s.posts) {
    const key = p.sourcePlatform || "unknown";
    byPlatform[key] = (byPlatform[key] || 0) + 1;
  }
  return NextResponse.json({
    settings: s.settings,
    groups,
    byPlatform,
    publicReadable: s.settings.visibility === "public",
  });
}

export async function PATCH(req: Request) {
  const s = getState();
  if (!isAdmin(s.currentUserId)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json();
  if (typeof body.dailyIngestHour === "number") {
    updateIngestSchedule(body.dailyIngestHour, body.ingestEnabled);
  } else if (typeof body.ingestEnabled === "boolean") {
    mutate((st) => {
      st.settings.ingestEnabled = body.ingestEnabled;
    });
  }
  if (body.visibility === "public" || body.visibility === "members") {
    mutate((st) => {
      st.settings.visibility = body.visibility;
    });
  }
  if (Array.isArray(body.youtubeChannelIds)) {
    mutate((st) => {
      st.settings.youtubeChannelIds = body.youtubeChannelIds.map(String).slice(0, 12);
    });
  }
  if (Array.isArray(body.enabledSources)) {
    mutate((st) => {
      st.settings.enabledSources = body.enabledSources as SourcePlatform[];
    });
  }
  return NextResponse.json({ settings: getState().settings });
}

export async function POST(req: Request) {
  const s = getState();
  if (!isAdmin(s.currentUserId)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "run_now") {
    const result = await runDailyIngest({
      youtubeLimit: Number(body.youtubeLimit || 4),
      rssLimit: Number(body.rssLimit || 5),
    });
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
