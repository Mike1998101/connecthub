import { NextResponse } from "next/server";
import { getState, mutate, uid } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const s = getState();

  if (id) {
    const user = s.users.find((u) => u.id === id);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const me = s.currentUserId;
    const isSelf = me === user.id;
    const isFriend = s.friendships.some(
      (f) =>
        f.status === "accepted" &&
        ((f.userId === me && f.friendId === user.id) ||
          (f.friendId === me && f.userId === user.id))
    );
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
    const posts = s.posts
      .filter((p) => p.authorId === user.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const isFollowing = !!me && s.follows.some((f) => f.followerId === me && f.followingId === user.id);
    const friendship = s.friendships.find(
      (f) =>
        (f.userId === me && f.friendId === user.id) ||
        (f.friendId === me && f.userId === user.id)
    );
    return NextResponse.json({
      user,
      posts,
      comments: s.comments
        .filter((c) => c.authorId === user.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 40)
        .map((c) => ({
          ...c,
          post: s.posts.find((p) => p.id === c.postId)
            ? {
                id: s.posts.find((p) => p.id === c.postId)!.id,
                title: s.posts.find((p) => p.id === c.postId)!.title,
              }
            : null,
        })),
      following: s.follows
        .filter((f) => f.followerId === user.id)
        .map((f) => s.users.find((u) => u.id === f.followingId))
        .filter(Boolean),
      followers: s.follows
        .filter((f) => f.followingId === user.id)
        .map((f) => s.users.find((u) => u.id === f.followerId))
        .filter(Boolean),
      isFollowing,
      friendship: friendship || null,
      canFollow: user.profilePublic || isFriend || isSelf,
      canAddFriend: user.profilePublic || isSelf,
    });
  }

  const ranked = [...s.users]
    .map((u) => {
      const userPosts = s.posts.filter((p) => p.authorId === u.id);
      const engagement = userPosts.reduce(
        (n, p) => n + p.upvotes + p.likes + p.commentCount * 2,
        0
      );
      return { ...u, engagement, activity: userPosts.length };
    })
    .sort((a, b) => b.engagement - a.engagement || b.rating - a.rating);

  return NextResponse.json({
    users: ranked,
    me: s.users.find((u) => u.id === s.currentUserId) || null,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  mutate((st) => {
    const u = st.users.find((x) => x.id === me);
    if (!u) return;
    if (typeof body.displayName === "string") u.displayName = body.displayName.slice(0, 60);
    if (typeof body.bio === "string") u.bio = body.bio.slice(0, 280);
    if (typeof body.location === "string") u.location = body.location.slice(0, 80);
    if (typeof body.profilePublic === "boolean") u.profilePublic = body.profilePublic;
    if (Array.isArray(body.interests)) u.interests = body.interests.slice(0, 12);
  });

  return NextResponse.json({ user: getState().users.find((u) => u.id === me) });
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;
  const targetId = body.userId as string;
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!targetId || targetId === me) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  const target = s.users.find((u) => u.id === targetId);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "follow") {
    if (!target.profilePublic) {
      const friend = s.friendships.some(
        (f) =>
          f.status === "accepted" &&
          ((f.userId === me && f.friendId === targetId) ||
            (f.friendId === me && f.userId === targetId))
      );
      if (!friend) {
        return NextResponse.json({ error: "Profile is private" }, { status: 403 });
      }
    }
    mutate((st) => {
      const exists = st.follows.find((f) => f.followerId === me && f.followingId === targetId);
      if (exists) {
        st.follows = st.follows.filter((f) => !(f.followerId === me && f.followingId === targetId));
        const u = st.users.find((x) => x.id === targetId);
        const m = st.users.find((x) => x.id === me);
        if (u) u.followersCount = Math.max(0, u.followersCount - 1);
        if (m) m.followingCount = Math.max(0, m.followingCount - 1);
      } else {
        st.follows.push({ followerId: me!, followingId: targetId, createdAt: new Date().toISOString() });
        const u = st.users.find((x) => x.id === targetId);
        const m = st.users.find((x) => x.id === me);
        if (u) u.followersCount += 1;
        if (m) m.followingCount += 1;
        st.notifications.unshift({
          id: uid("n"),
          userId: targetId,
          type: "follow",
          title: "New follower",
          body: `${st.users.find((x) => x.id === me)?.displayName} followed you`,
          href: `/users/${me}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "friend") {
    if (!target.profilePublic) {
      return NextResponse.json({ error: "Cannot add private profiles until they invite you" }, { status: 403 });
    }
    mutate((st) => {
      const existing = st.friendships.find(
        (f) =>
          (f.userId === me && f.friendId === targetId) ||
          (f.friendId === me && f.userId === targetId)
      );
      if (existing) {
        if (existing.status === "pending" && existing.friendId === me) {
          existing.status = "accepted";
          const a = st.users.find((x) => x.id === me);
          const b = st.users.find((x) => x.id === targetId);
          if (a) a.friendsCount += 1;
          if (b) b.friendsCount += 1;
        }
        return;
      }
      st.friendships.push({
        id: uid("f"),
        userId: me!,
        friendId: targetId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      st.notifications.unshift({
        id: uid("n"),
        userId: targetId,
        type: "friend_request",
        title: "Friend request",
        body: `${st.users.find((x) => x.id === me)?.displayName} sent a friend request`,
        href: "/friends",
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept_friend") {
    mutate((st) => {
      const f = st.friendships.find((x) => x.id === body.friendshipId && x.friendId === me);
      if (f && f.status === "pending") {
        f.status = "accepted";
        const a = st.users.find((x) => x.id === me);
        const b = st.users.find((x) => x.id === f.userId);
        if (a) a.friendsCount += 1;
        if (b) b.friendsCount += 1;
        st.notifications.unshift({
          id: uid("n"),
          userId: f.userId,
          type: "friend_request",
          title: "Friend request accepted",
          body: `${a?.displayName || "Someone"} accepted your friend request`,
          href: `/users/${me}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject_friend") {
    mutate((st) => {
      st.friendships = st.friendships.filter(
        (x) => !(x.id === body.friendshipId && x.friendId === me && x.status === "pending")
      );
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
