import { NextResponse } from "next/server";
import {
  areFriends,
  getCurrentUserId,
  prisma,
  uid,
  mapChatThread,
  mapChatMessage,
  mapUser,
} from "@/lib/db";
import { ensureDailyCron } from "@/lib/cron";

ensureDailyCron();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (threadId) {
    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, members: { some: { userId: me } } },
      include: { members: true },
    });
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      include: { sender: true },
    });
    const members = await prisma.user.findMany({
      where: { id: { in: thread.members.map((m) => m.userId) } },
    });
    return NextResponse.json({
      thread: mapChatThread(thread),
      messages: messages.map((m) => ({
        ...mapChatMessage(m),
        sender: mapUser(m.sender),
      })),
      members: members.map(mapUser),
    });
  }

  const threads = await prisma.chatThread.findMany({
    where: { members: { some: { userId: me } } },
    include: { members: true },
    orderBy: { lastMessageAt: "desc" },
  });
  const mapped = threads.map(mapChatThread);
  const requests = mapped.filter((t) => t.status === "request" && t.requestedBy !== me);
  return NextResponse.json({ threads: mapped, requests });
}

export async function POST(req: Request) {
  const body = await req.json();
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (body.action === "create") {
    const type = body.type === "group" ? "group" : "peer";
    const memberIds: string[] = Array.from(
      new Set([me, ...(body.memberIds || [])].filter(Boolean))
    );
    const other = memberIds.find((id) => id !== me);
    const friendsOk = type === "group" || !other || (await areFriends(me, other));
    const otherUser = other
      ? await prisma.user.findUnique({ where: { id: other } })
      : null;
    const thread = await prisma.chatThread.create({
      data: {
        id: uid("ch"),
        type,
        title: String(
          body.title ||
            (type === "group" ? "New group" : otherUser?.displayName || "Direct chat")
        ),
        lastPreview: friendsOk ? "Chat started" : "Message request",
        status: friendsOk ? "open" : "request",
        requestedById: friendsOk ? null : me,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: { members: true },
    });
    if (!friendsOk && other) {
      const meUser = await prisma.user.findUnique({ where: { id: me } });
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId: other,
          type: "message_request",
          title: "Message request",
          body: `${meUser?.displayName} wants to message you`,
          href: `/chat?thread=${thread.id}`,
          read: false,
        },
      });
    }
    return NextResponse.json({ thread: mapChatThread(thread) }, { status: 201 });
  }

  if (body.action === "accept_request") {
    const t = await prisma.chatThread.findFirst({
      where: { id: body.threadId, members: { some: { userId: me } }, status: "request" },
    });
    if (t) {
      await prisma.chatThread.update({
        where: { id: t.id },
        data: { status: "open", lastPreview: "Request accepted" },
      });
      if (t.requestedById && t.requestedById !== me) {
        const meUser = await prisma.user.findUnique({ where: { id: me } });
        await prisma.notificationItem.create({
          data: {
            id: uid("n"),
            userId: t.requestedById,
            type: "incoming_message",
            title: "Message request accepted",
            body: `${meUser?.displayName} accepted your message request`,
            href: `/chat?thread=${t.id}`,
            read: false,
          },
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add_member") {
    const threadId = body.threadId as string;
    const userId = body.userId as string;
    const t = await prisma.chatThread.findFirst({
      where: { id: threadId, type: "group", members: { some: { userId: me } } },
    });
    if (t && userId) {
      await prisma.chatMember.upsert({
        where: { threadId_userId: { threadId, userId } },
        create: { threadId, userId },
        update: {},
      });
      const u = await prisma.user.findUnique({ where: { id: userId } });
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { lastPreview: `Added ${u?.displayName || "member"}` },
      });
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId,
          type: "incoming_message",
          title: "Added to group",
          body: `You were added to ${t.title}`,
          href: `/chat?thread=${t.id}`,
          read: false,
        },
      });
    }
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { members: true },
    });
    return NextResponse.json({
      ok: true,
      thread: thread ? mapChatThread(thread) : null,
    });
  }

  if (body.action === "remove_member") {
    const threadId = body.threadId as string;
    const userId = body.userId as string;
    if (userId && userId !== me) {
      await prisma.chatMember.deleteMany({ where: { threadId, userId } });
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { lastPreview: "Removed a member" },
      });
    }
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { members: true },
    });
    return NextResponse.json({
      ok: true,
      thread: thread ? mapChatThread(thread) : null,
    });
  }

  if (body.action === "message") {
    const threadId = body.threadId as string;
    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, members: { some: { userId: me } } },
      include: { members: true },
    });
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (thread.status === "request" && thread.requestedById !== me) {
      return NextResponse.json(
        { error: "Accept the message request before replying" },
        { status: 403 }
      );
    }
    const message = await prisma.chatMessage.create({
      data: {
        id: uid("m"),
        threadId,
        senderId: me,
        body: String(body.body || "").slice(0, 2000),
      },
    });
    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: message.createdAt,
        lastPreview: message.body.slice(0, 80),
      },
    });
    for (const m of thread.members) {
      if (m.userId === me) continue;
      await prisma.notificationItem.create({
        data: {
          id: uid("n"),
          userId: m.userId,
          type: thread.status === "request" ? "message_request" : "incoming_message",
          title:
            thread.status === "request"
              ? "Message request"
              : thread.type === "group"
                ? thread.title
                : "Incoming message",
          body: message.body.slice(0, 100),
          href: `/chat?thread=${threadId}`,
          read: false,
        },
      });
    }
    return NextResponse.json({ message: mapChatMessage(message) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
