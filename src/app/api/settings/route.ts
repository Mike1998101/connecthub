import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  getSettings,
  isAdmin,
  listSourceGroups,
  prisma,
  updateSettings,
} from "@/lib/db";
import { ensureDailyCron, updateIngestSchedule } from "@/lib/cron";
import { runDailyIngest } from "@/lib/scrapers";
import type { SourcePlatform } from "@/lib/types";

ensureDailyCron();

export async function GET() {
  const settings = await getSettings();
  const groups = await listSourceGroups();
  const posts = await prisma.post.findMany({ select: { sourcePlatform: true } });
  const byPlatform: Record<string, number> = {};
  for (const p of posts) {
    const key = p.sourcePlatform || "unknown";
    byPlatform[key] = (byPlatform[key] || 0) + 1;
  }
  return NextResponse.json({
    settings,
    groups,
    byPlatform,
    publicReadable: settings.visibility === "public",
  });
}

export async function PATCH(req: Request) {
  const me = await getCurrentUserId();
  if (!(await isAdmin(me))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const body = await req.json();
  if (typeof body.dailyIngestHour === "number") {
    await updateIngestSchedule(body.dailyIngestHour, body.ingestEnabled);
  } else if (typeof body.ingestEnabled === "boolean") {
    await updateSettings({ ingestEnabled: body.ingestEnabled });
  }
  if (body.visibility === "public" || body.visibility === "members") {
    await updateSettings({ visibility: body.visibility });
  }
  if (Array.isArray(body.youtubeChannelIds)) {
    await updateSettings({
      youtubeChannelIds: body.youtubeChannelIds.map(String).slice(0, 12),
    });
  }
  if (Array.isArray(body.enabledSources)) {
    await updateSettings({
      enabledSources: body.enabledSources as SourcePlatform[],
    });
  }
  return NextResponse.json({ settings: await getSettings() });
}

export async function POST(req: Request) {
  const me = await getCurrentUserId();
  if (!(await isAdmin(me))) {
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
