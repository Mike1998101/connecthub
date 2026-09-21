import { NextResponse } from "next/server";
import { listPosts, listUsers, listTopics } from "@/lib/db";

export async function GET() {
  const weekAgo = Date.now() - 7 * 86400_000;
  const posts = (await listPosts()).filter((p) => +new Date(p.createdAt) >= weekAgo);
  const users = await listUsers();
  const topics = await listTopics();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const byUpvotes = [...posts]
    .sort((a, b) => b.upvotes - a.upvotes)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
    }));
  const byComments = [...posts]
    .sort((a, b) => b.commentCount - a.commentCount)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
    }));

  return NextResponse.json({
    window: "7d",
    mostUpvoted: byUpvotes,
    mostCommented: byComments,
  });
}
