import { NextResponse } from "next/server";
import { getState, mutate } from "@/lib/store";

export async function GET() {
  const s = getState();
  const me = s.users.find((u) => u.id === s.currentUserId) || null;
  return NextResponse.json({
    loggedIn: !!me,
    user: me,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;
  const s = getState();

  if (action === "login") {
    const username = String(body.username || "you").toLowerCase();
    const user = s.users.find((u) => u.username.toLowerCase() === username) || s.users.find((u) => u.id === "u5");
    mutate((st) => {
      st.currentUserId = user!.id;
    });
    return NextResponse.json({ user: getState().users.find((u) => u.id === getState().currentUserId) });
  }

  if (action === "logout") {
    mutate((st) => {
      st.currentUserId = null;
    });
    return NextResponse.json({ loggedIn: false });
  }

  if (action === "demo") {
    mutate((st) => {
      st.currentUserId = "u5";
    });
    return NextResponse.json({ user: getState().users.find((u) => u.id === "u5") });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
