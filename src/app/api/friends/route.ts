import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

export async function GET() {
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const friends = s.friendships
    .filter(
      (f) =>
        f.status === "accepted" && (f.userId === me || f.friendId === me)
    )
    .map((f) => {
      const otherId = f.userId === me ? f.friendId : f.userId;
      return { friendship: f, user: s.users.find((u) => u.id === otherId) };
    });

  const pending = s.friendships
    .filter((f) => f.status === "pending" && f.friendId === me)
    .map((f) => ({ friendship: f, user: s.users.find((u) => u.id === f.userId) }));

  const following = s.follows
    .filter((f) => f.followerId === me)
    .map((f) => s.users.find((u) => u.id === f.followingId))
    .filter(Boolean);

  const followers = s.follows
    .filter((f) => f.followingId === me)
    .map((f) => s.users.find((u) => u.id === f.followerId))
    .filter(Boolean);

  const friendIds = new Set(
    friends.map((f) => f.user?.id).filter(Boolean) as string[]
  );
  const suggestions = s.users
    .filter((u) => u.id !== me && u.profilePublic && !friendIds.has(u.id))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 8);

  return NextResponse.json({ friends, pending, following, followers, suggestions });
}
