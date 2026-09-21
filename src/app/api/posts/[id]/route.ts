import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  getPostById,
  listPosts,
  nestComments,
  prisma,
  uid,
  stripExternalUrls,
  mapPost,
} from "@/lib/db";
import { suggestSimilarPosts } from "@/lib/similarity";
import { formatIngestBody } from "@/lib/content";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const post = await getPostById(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (searchParams.get("similar") === "1") {
    const pool = await listPosts();
    const similar = suggestSimilarPosts(post, pool, 6).map((sp) => ({
      id: sp.id,
      title: sp.title,
      kind: sp.kind,
      sourcePlatform: sp.sourcePlatform,
      sourceGroup: sp.sourceGroup,
      clusterId: sp.clusterId,
    }));
    return NextResponse.json({ similar, seed: { id: post.id, clusterId: post.clusterId } });
  }

  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
  const topics = await prisma.topic.findMany({
    where: { id: { in: post.topicIds } },
  });
  const pool = await listPosts();

  return NextResponse.json({
    post: {
      ...post,
      author: author
        ? {
            id: author.id,
            displayName: author.displayName,
            username: author.username,
            avatarUrl: author.avatarUrl,
          }
        : undefined,
      topics,
      comments: await nestComments(post.id),
      similar: suggestSimilarPosts(post, pool, 4),
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const action = body.action as string;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "comment") {
    const formatted = formatIngestBody(String(body.body || ""));
    const comment = await prisma.comment.create({
      data: {
        id: uid("c"),
        postId: id,
        authorId: userId,
        parentId: (body.parentId as string) || null,
        body: formatted.body || stripExternalUrls(String(body.body || "")),
      },
    });
    await prisma.post.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    });
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (post.authorId !== userId) {
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId: post.authorId,
          type: "comment",
          title: "New comment",
          body: `${me?.displayName || "Someone"} commented on your post`,
          href: `/?focus=${id}`,
          read: false,
        },
      });
    }
    return NextResponse.json({ comments: await nestComments(id), comment });
  }

  if (action === "vote") {
    const dir = body.dir === -1 ? -1 : 1;
    const voters = (post.voters as Record<string, 1 | -1>) || {};
    const prev = voters[userId];
    let upvotes = post.upvotes;
    let downvotes = post.downvotes;
    if (prev === 1) upvotes -= 1;
    if (prev === -1) downvotes -= 1;
    if (prev === dir) {
      delete voters[userId];
    } else {
      voters[userId] = dir;
      if (dir === 1) upvotes += 1;
      else downvotes += 1;
    }
    const updated = await prisma.post.update({
      where: { id },
      data: { voters, upvotes, downvotes },
      include: { topics: true },
    });
    return NextResponse.json({ post: mapPost(updated) });
  }

  if (action === "like") {
    let likedBy = [...post.likedBy];
    let likes = post.likes;
    if (likedBy.includes(userId)) {
      likedBy = likedBy.filter((x) => x !== userId);
      likes = Math.max(0, likes - 1);
    } else {
      likedBy.push(userId);
      likes += 1;
    }
    const updated = await prisma.post.update({
      where: { id },
      data: { likedBy, likes },
      include: { topics: true },
    });
    return NextResponse.json({ post: mapPost(updated) });
  }

  if (action === "bookmark") {
    let bookmarkedBy = [...post.bookmarkedBy];
    if (bookmarkedBy.includes(userId)) {
      bookmarkedBy = bookmarkedBy.filter((x) => x !== userId);
    } else {
      bookmarkedBy.push(userId);
    }
    const updated = await prisma.post.update({
      where: { id },
      data: { bookmarkedBy },
      include: { topics: true },
    });
    return NextResponse.json({ post: mapPost(updated) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
