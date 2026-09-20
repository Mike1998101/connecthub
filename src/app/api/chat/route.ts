import { NextResponse } from "next/server";
import { getState, mutate, uid } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (threadId) {
    const thread = s.chats.find((c) => c.id === threadId && c.memberIds.includes(me));
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const messages = s.messages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map((m) => ({ ...m, sender: s.users.find((u) => u.id === m.senderId) }));
    return NextResponse.json({ thread, messages });
  }

  const threads = s.chats
    .filter((c) => c.memberIds.includes(me))
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const body = await req.json();
  const s = getState();
  const me = s.currentUserId;
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (body.action === "create") {
    const type = body.type === "group" ? "group" : "peer";
    const memberIds: string[] = Array.from(
      new Set([me, ...(body.memberIds || [])].filter(Boolean))
    );
    const thread = {
      id: uid("ch"),
      type: type as "peer" | "group",
      title: String(body.title || (type === "group" ? "New group" : "Direct chat")),
      memberIds,
      lastMessageAt: new Date().toISOString(),
      lastPreview: "Chat started",
    };
    mutate((st) => {
      st.chats.unshift(thread);
    });
    return NextResponse.json({ thread }, { status: 201 });
  }

  if (body.action === "message") {
    const threadId = body.threadId as string;
    const thread = s.chats.find((c) => c.id === threadId && c.memberIds.includes(me));
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const message = {
      id: uid("m"),
      threadId,
      senderId: me,
      body: String(body.body || "").slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    mutate((st) => {
      st.messages.push(message);
      const t = st.chats.find((c) => c.id === threadId)!;
      t.lastMessageAt = message.createdAt;
      t.lastPreview = message.body.slice(0, 80);
      for (const mid of t.memberIds) {
        if (mid === me) continue;
        st.notifications.unshift({
          id: uid("n"),
          userId: mid,
          type: "chat",
          title: t.type === "group" ? t.title : "New message",
          body: message.body.slice(0, 100),
          href: `/chat?thread=${threadId}`,
          read: false,
          createdAt: message.createdAt,
        });
      }
    });
    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
