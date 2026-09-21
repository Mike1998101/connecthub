import { NextResponse } from "next/server";
import { getCurrentUserId, prisma, mapNotification } from "@/lib/db";

export async function GET() {
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const items = await prisma.notificationItem.findMany({
    where: { userId: me },
    orderBy: { createdAt: "desc" },
  });
  const notifications = items.map(mapNotification);
  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const me = await getCurrentUserId();
  if (!me) return NextResponse.json({ error: "Login required" }, { status: 401 });

  if (body.action === "read_all") {
    await prisma.notificationItem.updateMany({
      where: { userId: me },
      data: { read: true },
    });
  } else if (body.action === "read" && body.id) {
    await prisma.notificationItem.updateMany({
      where: { id: body.id, userId: me },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
