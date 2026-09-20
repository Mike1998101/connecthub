import { NextResponse } from "next/server";
import { getState, mutate, stripExternalUrls, uid, nestComments } from "@/lib/store";
import { suggestSimilarPosts } from "@/lib/similarity";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const s = getState();
  const post = s.posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (searchParams.get("similar") === "1") {
    const similar = suggestSimilarPosts(post, s.posts, 6).map((sp) => ({
      id: sp.id,
      title: sp.title,
      kind: sp.kind,
      sourcePlatform: sp.sourcePlatform,
      sourceGroup: sp.sourceGroup,
      clusterId: sp.clusterId,
    }));
    return NextResponse.json({ similar, seed: { id: post.id, clusterId: post.clusterId } });
  }

  return NextResponse.json({
    post: {
      ...post,
      author: s.users.find((u) => u.id === post.authorId),
      topics: s.topics.filter((t) => post.topicIds.includes(t.id)),
      comments: nestComments(post.id),
      similar: suggestSimilarPosts(post, s.posts, 4),
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
  const s = getState();
  const userId = s.currentUserId;
  if (!userId) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const post = s.posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "comment") {
    const comment = {
      id: uid("c"),
      postId: id,
      authorId: userId,
      parentId: (body.parentId as string) || null,
      body: stripExternalUrls(String(body.body || "")),
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
    };
    mutate((st) => {
      st.comments.push(comment);
      const p = st.posts.find((x) => x.id === id);
      if (p) p.commentCount += 1;
      st.notifications.unshift({
        id: uid("n"),
        userId: post.authorId,
        type: "comment",
        title: "New comment",
        body: `${st.users.find((u) => u.id === userId)?.displayName} commented on your post`,
        href: `/?focus=${id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    return NextResponse.json({ comments: nestComments(id) });
  }

  if (action === "vote") {
    const dir = body.dir === -1 ? -1 : 1;
    mutate((st) => {
      const p = st.posts.find((x) => x.id === id)!;
      const prev = p.voters[userId];
      if (prev === 1) p.upvotes -= 1;
      if (prev === -1) p.downvotes -= 1;
      if (prev === dir) {
        delete p.voters[userId];
      } else {
        p.voters[userId] = dir;
        if (dir === 1) p.upvotes += 1;
        else p.downvotes += 1;
      }
    });
    return NextResponse.json({ post: getState().posts.find((p) => p.id === id) });
  }

  if (action === "like") {
    mutate((st) => {
      const p = st.posts.find((x) => x.id === id)!;
      if (p.likedBy.includes(userId)) {
        p.likedBy = p.likedBy.filter((x) => x !== userId);
        p.likes = Math.max(0, p.likes - 1);
      } else {
        p.likedBy.push(userId);
        p.likes += 1;
      }
    });
    return NextResponse.json({ post: getState().posts.find((p) => p.id === id) });
  }

  if (action === "bookmark") {
    mutate((st) => {
      const p = st.posts.find((x) => x.id === id)!;
      if (p.bookmarkedBy.includes(userId)) {
        p.bookmarkedBy = p.bookmarkedBy.filter((x) => x !== userId);
      } else {
        p.bookmarkedBy.push(userId);
      }
    });
    return NextResponse.json({ post: getState().posts.find((p) => p.id === id) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
