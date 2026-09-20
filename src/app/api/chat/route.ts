import { NextResponse } from "next/server";
import {
  areFriends,
  getState,
  mutate,
  uid,
} from "@/lib/store";
import { ensureDailyCron } from "@/lib/cron";

ensureDailyCron();

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
    const members = thread.memberIds
      .map((id) => s.users.find((u) => u.id === id))
      .filter(Boolean);
    return NextResponse.json({ thread, messages, members });
  }

  const threads = s.chats
    .filter((c) => c.memberIds.includes(me))
    .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));

  const requests = threads.filter((t) => t.status === "request" && t.requestedBy !== me);

  return NextResponse.json({ threads, requests });
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
    const other = memberIds.find((id) => id !== me);
    const friendsOk = type === "group" || !other || areFriends(me, other);
    const thread = {
      id: uid("ch"),
      type: type as "peer" | "group",
      title: String(
        body.title ||
          (type === "group"
            ? "New group"
            : s.users.find((u) => u.id === other)?.displayName || "Direct chat")
      ),
      memberIds,
      lastMessageAt: new Date().toISOString(),
      lastPreview: friendsOk ? "Chat started" : "Message request",
      status: (friendsOk ? "open" : "request") as "open" | "request",
      requestedBy: friendsOk ? undefined : me,
    };
    mutate((st) => {
      st.chats.unshift(thread);
      if (!friendsOk && other) {
        st.notifications.unshift({
          id: uid("n"),
          userId: other,
          type: "message_request",
          title: "Message request",
          body: `${st.users.find((x) => x.id === me)?.displayName} wants to message you`,
          href: `/chat?thread=${thread.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    return NextResponse.json({ thread }, { status: 201 });
  }

  if (body.action === "accept_request") {
    mutate((st) => {
      const t = st.chats.find((c) => c.id === body.threadId && c.memberIds.includes(me!));
      if (t && t.status === "request") {
        t.status = "open";
        t.lastPreview = "Request accepted";
        if (t.requestedBy && t.requestedBy !== me) {
          st.notifications.unshift({
            id: uid("n"),
            userId: t.requestedBy,
            type: "incoming_message",
            title: "Message request accepted",
            body: `${st.users.find((x) => x.id === me)?.displayName} accepted your message request`,
            href: `/chat?thread=${t.id}`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_member") {
    const threadId = body.threadId as string;
    const userId = body.userId as string;
    mutate((st) => {
      const t = st.chats.find(
        (c) => c.id === threadId && c.type === "group" && c.memberIds.includes(me!)
      );
      if (t && userId && !t.memberIds.includes(userId)) {
        t.memberIds.push(userId);
        t.lastPreview = `Added ${st.users.find((u) => u.id === userId)?.displayName || "member"}`;
        st.notifications.unshift({
          id: uid("n"),
          userId,
          type: "incoming_message",
          title: "Added to group",
          body: `You were added to ${t.title}`,
          href: `/chat?thread=${t.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    return NextResponse.json({ ok: true, thread: getState().chats.find((c) => c.id === threadId) });
  }

  if (body.action === "remove_member") {
    const threadId = body.threadId as string;
    const userId = body.userId as string;
    mutate((st) => {
      const t = st.chats.find(
        (c) => c.id === threadId && c.type === "group" && c.memberIds.includes(me!)
      );
      if (t && userId && userId !== me) {
        t.memberIds = t.memberIds.filter((id) => id !== userId);
        t.lastPreview = `Removed a member`;
      }
    });
    return NextResponse.json({ ok: true, thread: getState().chats.find((c) => c.id === threadId) });
  }

  if (body.action === "message") {
    const threadId = body.threadId as string;
    const thread = s.chats.find((c) => c.id === threadId && c.memberIds.includes(me));
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (thread.status === "request" && thread.requestedBy !== me) {
      return NextResponse.json(
        { error: "Accept the message request before replying" },
        { status: 403 }
      );
    }
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
          type: t.status === "request" ? "message_request" : "incoming_message",
          title: t.status === "request" ? "Message request" : t.type === "group" ? t.title : "Incoming message",
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
