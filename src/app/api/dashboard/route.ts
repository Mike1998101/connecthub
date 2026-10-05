import { NextResponse } from "next/server";
import { getCurrentUserId, listPosts, listUsers, listTopics, listSourceGroups } from "@/lib/db";
import { loadPrefs, savePrefs } from "@/lib/activity";

export async function GET() {
  const me = await getCurrentUserId();
  const [posts, users, topics, groups] = await Promise.all([
    listPosts(),
    listUsers(),
    listTopics(),
    listSourceGroups(),
  ]);

  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const recent = posts.filter((p) => +new Date(p.createdAt) >= weekAgo);
  const myPosts = me ? posts.filter((p) => p.authorId === me) : [];

  const viewsProxy = myPosts.reduce((n, p) => n + p.upvotes + p.likes + p.commentCount, 0);
  const engagement = myPosts.reduce((n, p) => n + p.likes + p.commentCount, 0);
  const follows = users.find((u) => u.id === me);

  const prefs = me ? await loadPrefs(me) : null;

  return NextResponse.json({
    me,
    prefs,
    analytics: {
      postsThisWeek: recent.length,
      myPosts: myPosts.length,
      views: viewsProxy,
      engagement,
      followers: follows?.followersCount || 0,
      following: follows?.followingCount || 0,
      friends: follows?.friendsCount || 0,
      byKind: {
        short: posts.filter((p) => p.kind === "short").length,
        music: posts.filter((p) => p.kind === "music").length,
        video: posts.filter((p) => p.kind === "video").length,
        article: posts.filter((p) => p.kind === "article" || p.kind === "news").length,
        text: posts.filter((p) => p.kind === "text" || p.kind === "image").length,
      },
      topPosts: [...posts]
        .sort((a, b) => b.upvotes + b.commentCount - (a.upvotes + a.commentCount))
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          title: p.title,
          kind: p.kind,
          upvotes: p.upvotes,
          comments: p.commentCount,
          thumbnail: p.media?.thumbnailUrl || p.imageUrls?.[0],
        })),
      topics: topics.length,
      groups,
    },
  });
}

export async function PATCH(req: Request) {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const body = await req.json();
  const prefs = await savePrefs(me, body.prefs || body);
  return NextResponse.json({ prefs });
}
