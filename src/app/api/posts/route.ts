import { NextResponse } from "next/server";
import { getState, mutate, stripExternalUrls, uid, nestComments } from "@/lib/store";
import type { FeedSort, Post } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") || "chronological") as FeedSort;
  const topic = searchParams.get("topic");
  const s = getState();
  let posts = [...s.posts];

  if (topic) {
    const t = s.topics.find((x) => x.slug === topic || x.id === topic);
    if (t) posts = posts.filter((p) => p.topicIds.includes(t.id));
  }

  if (sort === "trending") {
    posts.sort((a, b) => score(b) - score(a));
  } else if (sort === "topic" && !topic) {
    posts.sort((a, b) => (a.topicIds[0] || "").localeCompare(b.topicIds[0] || ""));
  } else {
    posts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  const enriched = posts.map((p) => ({
    ...p,
    author: s.users.find((u) => u.id === p.authorId),
    topics: s.topics.filter((t) => p.topicIds.includes(t.id)),
    comments: nestComments(p.id),
  }));

  return NextResponse.json({ posts: enriched, sort, topic });
}

function score(p: Post) {
  const ageHours = Math.max(1, (Date.now() - +new Date(p.createdAt)) / 3600_000);
  return (p.upvotes * 2 + p.likes + p.commentCount * 3 - p.downvotes) / Math.pow(ageHours, 1.1);
}

export async function POST(req: Request) {
  const body = await req.json();
  const s = getState();
  const userId = s.currentUserId;
  if (!userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const kind = body.kind || "text";
  const post: Post = {
    id: uid("p"),
    authorId: userId,
    kind,
    title: String(body.title || "Untitled").slice(0, 120),
    body: stripExternalUrls(String(body.body || "")),
    topicIds: Array.isArray(body.topicIds) ? body.topicIds : ["t3"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    likes: 0,
    commentCount: 0,
    imageUrls: body.imageUrls,
    media: body.media,
    sourceHidden: true,
    bookmarkedBy: [],
    likedBy: [],
    voters: {},
  };

  mutate((st) => {
    st.posts.unshift(post);
    const u = st.users.find((x) => x.id === userId);
    if (u) u.postsCount += 1;
  });

  return NextResponse.json({ post }, { status: 201 });
}
