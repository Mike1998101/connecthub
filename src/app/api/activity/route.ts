import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/db";
import { loadActivity, recordActivity } from "@/lib/activity";

export async function GET() {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ activity: [] });
  const activity = await loadActivity(me);
  return NextResponse.json({ activity });
}

export async function POST(req: Request) {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ ok: false, skipped: true });
  const body = await req.json();
  const type = body.type as "search" | "view" | "watch" | "like" | "bookmark";
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
  const event = await recordActivity({
    userId: me,
    type,
    query: body.query,
    postId: body.postId,
    topicIds: body.topicIds,
    kind: body.kind,
    tags: body.tags,
  });
  return NextResponse.json({ ok: true, event });
}
