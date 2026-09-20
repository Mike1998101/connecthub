import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

export async function GET() {
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const posts = s.posts
    .filter((p) => p.bookmarkedBy.includes(me))
    .map((p) => ({
      ...p,
      author: s.users.find((u) => u.id === p.authorId),
      topics: s.topics.filter((t) => p.topicIds.includes(t.id)),
    }));
  return NextResponse.json({ posts });
}
