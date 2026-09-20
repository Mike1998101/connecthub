import { NextResponse } from "next/server";
import { getState, mutate } from "@/lib/store";

export async function GET() {
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const items = s.notifications
    .filter((n) => n.userId === me)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return NextResponse.json({
    notifications: items,
    unread: items.filter((n) => !n.read).length,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (body.action === "read_all") {
    mutate((st) => {
      st.notifications.forEach((n) => {
        if (n.userId === me) n.read = true;
      });
    });
  } else if (body.action === "read" && body.id) {
    mutate((st) => {
      const n = st.notifications.find((x) => x.id === body.id && x.userId === me);
      if (n) n.read = true;
    });
  }

  return NextResponse.json({ ok: true });
}
