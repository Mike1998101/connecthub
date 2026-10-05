import { NextResponse } from "next/server";
import { getCurrentUserId, listPosts, listTopics, listUsers, nestComments } from "@/lib/db";
import { loadActivity, recommendFromHistory } from "@/lib/activity";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") || undefined;
  const me = await getCurrentUserId();
  const [posts, topics, users] = await Promise.all([
    listPosts(),
    listTopics(),
    listUsers(),
  ]);
  const activity = me ? await loadActivity(me) : [];
  const recommended = recommendFromHistory(posts, activity, {
    kind,
    limit: 16,
  });

  // Cold start: trending mix
  const pool =
    recommended.length >= 4
      ? recommended
      : [...posts].sort(
          (a, b) => b.upvotes + b.likes + b.commentCount - (a.upvotes + a.likes + a.commentCount)
        );

  const filtered = kind ? pool.filter((p) => p.kind === kind) : pool;
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const enriched = await Promise.all(
    filtered.slice(0, 12).map(async (p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
      comments: await nestComments(p.id),
    }))
  );

  return NextResponse.json({
    posts: enriched,
    personalized: !!me && activity.length > 0,
    activityCount: activity.length,
  });
}
