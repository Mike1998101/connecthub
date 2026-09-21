import { NextResponse } from "next/server";
import { getCurrentUserId, prisma, mapUser, mapFriendship, mapFollow } from "@/lib/db";

export async function GET() {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ userId: me }, { friendId: me }],
    },
  });
  const friends = await Promise.all(
    friendships.map(async (f) => {
      const otherId = f.userId === me ? f.friendId : f.userId;
      const user = await prisma.user.findUnique({ where: { id: otherId } });
      return { friendship: mapFriendship(f), user: user ? mapUser(user) : undefined };
    })
  );

  const pendingRows = await prisma.friendship.findMany({
    where: { status: "pending", friendId: me },
  });
  const pending = await Promise.all(
    pendingRows.map(async (f) => {
      const user = await prisma.user.findUnique({ where: { id: f.userId } });
      return { friendship: mapFriendship(f), user: user ? mapUser(user) : undefined };
    })
  );

  const followingRows = await prisma.follow.findMany({
    where: { followerId: me },
    include: { following: true },
  });
  const followerRows = await prisma.follow.findMany({
    where: { followingId: me },
    include: { follower: true },
  });

  const friendIds = new Set(friends.map((f) => f.user?.id).filter(Boolean) as string[]);
  const suggestions = (await prisma.user.findMany({
    where: {
      id: { not: me },
      profilePublic: true,
      NOT: { id: { in: [...friendIds] } },
    },
    orderBy: { rating: "desc" },
    take: 8,
  })).map(mapUser);

  return NextResponse.json({
    friends,
    pending,
    following: followingRows.map((f) => mapUser(f.following)),
    followers: followerRows.map((f) => mapUser(f.follower)),
    suggestions,
  });
}
