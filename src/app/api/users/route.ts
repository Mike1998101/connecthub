import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  listPosts,
  listUsers,
  nestComments,
  prisma,
  uid,
  mapUser,
  areFriends,
} from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const me = await getCurrentUserId();

  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isSelf = me === user.id;
    const isFriend = me ? await areFriends(me, user.id) : false;
    if (!user.profilePublic && !isSelf && !isFriend) {
      return NextResponse.json({
        user: {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          profilePublic: false,
          locked: true,
        },
      });
    }
    const posts = await listPosts({ authorId: user.id });
    const comments = await prisma.comment.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const postIds = [...new Set(comments.map((c) => c.postId))];
    const commentPosts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, title: true },
    });
    const postTitle = new Map(commentPosts.map((p) => [p.id, p.title]));
    const followingRows = await prisma.follow.findMany({
      where: { followerId: user.id },
      include: { following: true },
    });
    const followerRows = await prisma.follow.findMany({
      where: { followingId: user.id },
      include: { follower: true },
    });
    const isFollowing =
      !!me &&
      !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: me, followingId: user.id } },
      }));
    const friendship = me
      ? await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: me, friendId: user.id },
              { friendId: me, userId: user.id },
            ],
          },
        })
      : null;

    return NextResponse.json({
      user: mapUser(user),
      posts,
      comments: comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        post: postTitle.has(c.postId)
          ? { id: c.postId, title: postTitle.get(c.postId)! }
          : null,
      })),
      following: followingRows.map((f) => mapUser(f.following)),
      followers: followerRows.map((f) => mapUser(f.follower)),
      isFollowing,
      friendship: friendship
        ? {
            id: friendship.id,
            userId: friendship.userId,
            friendId: friendship.friendId,
            status: friendship.status,
            createdAt: friendship.createdAt.toISOString(),
          }
        : null,
      canFollow: user.profilePublic || isFriend || isSelf,
      canAddFriend: user.profilePublic || isSelf,
    });
  }

  const users = await listUsers();
  const allPosts = await listPosts();
  const ranked = users
    .map((u) => {
      const userPosts = allPosts.filter((p) => p.authorId === u.id);
      const engagement = userPosts.reduce(
        (n, p) => n + p.upvotes + p.likes + p.commentCount * 2,
        0
      );
      return { ...u, engagement, activity: userPosts.length };
    })
    .sort((a, b) => b.engagement - a.engagement || b.rating - a.rating);

  const meUser = me ? await prisma.user.findUnique({ where: { id: me } }) : null;
  return NextResponse.json({
    users: ranked,
    me: meUser ? mapUser(meUser) : null,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const updated = await prisma.user.update({
    where: { id: me },
    data: {
      ...(typeof body.displayName === "string"
        ? { displayName: body.displayName.slice(0, 60) }
        : {}),
      ...(typeof body.bio === "string" ? { bio: body.bio.slice(0, 280) } : {}),
      ...(typeof body.location === "string"
        ? { location: body.location.slice(0, 80) }
        : {}),
      ...(typeof body.profilePublic === "boolean"
        ? { profilePublic: body.profilePublic }
        : {}),
      ...(Array.isArray(body.interests) ? { interests: body.interests.slice(0, 12) } : {}),
    },
  });
  return NextResponse.json({ user: mapUser(updated) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;
  const targetId = body.userId as string;
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!targetId || targetId === me) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const meUser = await prisma.user.findUnique({ where: { id: me } });

  if (action === "follow") {
    if (!target.profilePublic) {
      const friend = await areFriends(me, targetId);
      if (!friend) {
        return NextResponse.json({ error: "Profile is private" }, { status: 403 });
      }
    }
    const exists = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: me, followingId: targetId } },
    });
    if (exists) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: me, followingId: targetId } },
      });
      await prisma.user.update({
        where: { id: targetId },
        data: { followersCount: { decrement: 1 } },
      });
      await prisma.user.update({
        where: { id: me },
        data: { followingCount: { decrement: 1 } },
      });
    } else {
      await prisma.follow.create({
        data: { followerId: me, followingId: targetId },
      });
      await prisma.user.update({
        where: { id: targetId },
        data: { followersCount: { increment: 1 } },
      });
      await prisma.user.update({
        where: { id: me },
        data: { followingCount: { increment: 1 } },
      });
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId: targetId,
          type: "follow",
          title: "New follower",
          body: `${meUser?.displayName} followed you`,
          href: `/users/${me}`,
          read: false,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "friend") {
    if (!target.profilePublic) {
      return NextResponse.json(
        { error: "Cannot add private profiles until they invite you" },
        { status: 403 }
      );
    }
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: me, friendId: targetId },
          { friendId: me, userId: targetId },
        ],
      },
    });
    if (existing) {
      if (existing.status === "pending" && existing.friendId === me) {
        await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "accepted" },
        });
        await prisma.user.update({
          where: { id: me },
          data: { friendsCount: { increment: 1 } },
        });
        await prisma.user.update({
          where: { id: targetId },
          data: { friendsCount: { increment: 1 } },
        });
      }
      return NextResponse.json({ ok: true });
    }
    await prisma.friendship.create({
      data: {
        id: uid("f"),
        userId: me,
        friendId: targetId,
        status: "pending",
      },
    });
    await prisma.notificationItem.create({
      data: {
        id: uid("n"),
        userId: targetId,
        type: "friend_request",
        title: "Friend request",
        body: `${meUser?.displayName} sent a friend request`,
        href: "/friends",
        read: false,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept_friend") {
    const f = await prisma.friendship.findFirst({
      where: { id: body.friendshipId, friendId: me, status: "pending" },
    });
    if (f) {
      await prisma.friendship.update({
        where: { id: f.id },
        data: { status: "accepted" },
      });
      await prisma.user.update({
        where: { id: me },
        data: { friendsCount: { increment: 1 } },
      });
      await prisma.user.update({
        where: { id: f.userId },
        data: { friendsCount: { increment: 1 } },
      });
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId: f.userId,
          type: "friend_request",
          title: "Friend request accepted",
          body: `${meUser?.displayName || "Someone"} accepted your friend request`,
          href: `/users/${me}`,
          read: false,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reject_friend") {
    await prisma.friendship.deleteMany({
      where: { id: body.friendshipId, friendId: me, status: "pending" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
