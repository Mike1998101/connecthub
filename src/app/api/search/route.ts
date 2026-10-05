import { NextResponse } from "next/server";
import { getCurrentUserId, listPosts, listTopics, listUsers, nestComments } from "@/lib/db";
import { recordActivity, searchPosts } from "@/lib/activity";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ posts: [], query: q, message: "Enter a search query" });
  }

  const me = await getCurrentUserId();
  if (me) {
    await recordActivity({ userId: me, type: "search", query: q });
  }

  const [posts, topics, users] = await Promise.all([
    listPosts(),
    listTopics(),
    listUsers(),
  ]);
  const hits = searchPosts(posts, q).slice(0, 40);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const enriched = await Promise.all(
    hits.map(async (p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
      comments: await nestComments(p.id),
    }))
  );

  return NextResponse.json({
    query: q,
    count: enriched.length,
    posts: enriched,
  });
}
