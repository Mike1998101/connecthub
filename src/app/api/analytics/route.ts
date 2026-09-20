import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

export async function GET() {
  const s = getState();
  const weekAgo = Date.now() - 7 * 86400_000;
  const recent = s.posts.filter((p) => +new Date(p.createdAt) >= weekAgo);

  const byUpvotes = [...recent].sort((a, b) => b.upvotes - a.upvotes).slice(0, 10);
  const byComments = [...recent].sort((a, b) => b.commentCount - a.commentCount).slice(0, 10);
  const byLikes = [...recent].sort((a, b) => b.likes - a.likes).slice(0, 10);

  const enrich = (posts: typeof recent) =>
    posts.map((p) => ({
      ...p,
      author: s.users.find((u) => u.id === p.authorId),
      topics: s.topics.filter((t) => p.topicIds.includes(t.id)),
    }));

  return NextResponse.json({
    window: "last_7_days",
    totals: {
      posts: recent.length,
      upvotes: recent.reduce((n, p) => n + p.upvotes, 0),
      comments: recent.reduce((n, p) => n + p.commentCount, 0),
    },
    mostUpvoted: enrich(byUpvotes),
    mostCommented: enrich(byComments),
    mostLiked: enrich(byLikes),
    detailsFetched: ["upvotes", "downvotes", "likes", "commentCount", "author", "topics"],
    detailsToFetch: ["uniqueViewers", "shareRate", "avgWatchTime", "retentionCurve"],
  });
}
