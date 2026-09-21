import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  getSettings,
  listPosts,
  listSourceGroups,
  listTopics,
  listUsers,
  createPost,
  nestComments,
  uid,
  stripExternalUrls,
} from "@/lib/db";
import { suggestSimilarPosts } from "@/lib/similarity";
import { formatIngestBody } from "@/lib/content";
import type { FeedSort, Post } from "@/lib/types";
import { ensureDailyCron } from "@/lib/cron";

ensureDailyCron();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") || "chronological") as FeedSort;
  const topic = searchParams.get("topic");
  const group = searchParams.get("group");
  const settings = await getSettings();
  const me = await getCurrentUserId();

  if (settings.visibility !== "public" && !me) {
    return NextResponse.json({ error: "Members only" }, { status: 401 });
  }

  const topics = await listTopics();
  const topicRow = topic
    ? topics.find((x) => x.slug === topic || x.id === topic)
    : undefined;

  let posts = await listPosts({
    topicId: topicRow?.id,
    group: group || undefined,
  });

  if (sort === "trending") {
    posts.sort((a, b) => score(b) - score(a));
  } else if (sort === "topic" && !topic) {
    posts.sort((a, b) => (a.topicIds[0] || "").localeCompare(b.topicIds[0] || ""));
  } else {
    posts.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  const users = await listUsers();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  const enriched = await Promise.all(
    posts.map(async (p) => ({
      ...p,
      author: userMap.get(p.authorId),
      topics: p.topicIds.map((id) => topicMap.get(id)).filter(Boolean),
      comments: await nestComments(p.id),
      similar: suggestSimilarPosts(p, posts, 4).map((sp) => ({
        id: sp.id,
        title: sp.title,
        kind: sp.kind,
        sourcePlatform: sp.sourcePlatform,
        sourceGroup: sp.sourceGroup,
      })),
    }))
  );

  const groups = await listSourceGroups();

  return NextResponse.json({ posts: enriched, sort, topic, group, groups });
}

function score(p: Post) {
  const ageHours = Math.max(1, (Date.now() - +new Date(p.createdAt)) / 3600_000);
  return (p.upvotes * 2 + p.likes + p.commentCount * 3 - p.downvotes) / Math.pow(ageHours, 1.1);
}

export async function POST(req: Request) {
  const body = await req.json();
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const formatted = formatIngestBody(String(body.body || ""));
  const topicIds = Array.isArray(body.topicIds) ? body.topicIds : ["t3"];
  const imageUrls = [
    ...(body.imageUrls || []),
    ...formatted.imageUrls,
  ].filter((u: string, i: number, a: string[]) => a.indexOf(u) === i);

  const post = await createPost({
    id: uid("p"),
    authorId: userId,
    kind: body.kind || (imageUrls.length ? "image" : "text"),
    title: stripExternalUrls(String(body.title || "Untitled")).slice(0, 120),
    body: formatted.body || stripExternalUrls(String(body.body || "")),
    topicIds,
    imageUrls,
    media: body.media || (formatted.youtubeVideoId
      ? { youtubeVideoId: formatted.youtubeVideoId, orientation: "landscape" }
      : undefined),
    sourcePlatform: "community",
    sourceGroup: "Community",
    clusterId: `community:${topicIds[0] || "t3"}`,
  });

  return NextResponse.json({ post }, { status: 201 });
}
