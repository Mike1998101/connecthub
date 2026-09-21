import { NextResponse } from "next/server";
import { getCurrentUserId, listPosts, listTopics, listUsers } from "@/lib/db";

export async function GET() {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const posts = await listPosts({ bookmarkedBy: me });
  const users = await listUsers();
  const topics = await listTopics();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));
  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
    })),
  });
}
