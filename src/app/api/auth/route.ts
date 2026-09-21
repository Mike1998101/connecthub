import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  getUserByUsername,
  prisma,
  setCurrentUserId,
  mapUser,
  uid,
} from "@/lib/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const meId = await getCurrentUserId();
  const me = meId
    ? await prisma.user.findUnique({ where: { id: meId } })
    : null;
  return NextResponse.json({
    loggedIn: !!me,
    user: me ? mapUser(me) : null,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "login") {
    const username = String(body.username || "you").toLowerCase();
    const user = await getUserByUsername(username);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await setCurrentUserId(user.id);
    return NextResponse.json({ user });
  }

  if (action === "logout") {
    await setCurrentUserId(null);
    try {
      const jar = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => jar.getAll(),
            setAll: (items) => {
              items.forEach(({ name, value, options }) => jar.set(name, value, options));
            },
          },
        }
      );
      await supabase.auth.signOut();
    } catch {
      // optional
    }
    return NextResponse.json({ loggedIn: false });
  }

  if (action === "demo") {
    await setCurrentUserId("u5");
    const fresh = await prisma.user.findUnique({ where: { id: "u5" } });
    return NextResponse.json({ user: fresh ? mapUser(fresh) : null });
  }

  if (action === "google_url") {
    const origin = new URL(req.url).origin;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        {
          error:
            "Google sign-in needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Enable the Google provider in Supabase Auth and add the callback URL /api/auth/callback.",
        },
        { status: 400 }
      );
    }
    const jar = await cookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (items) => {
            items.forEach(({ name, value, options }) => jar.set(name, value, options));
          },
        },
      }
    );
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error || !data.url) {
      return NextResponse.json(
        { error: error?.message || "Google sign-in unavailable. Enable Google provider in Supabase Auth." },
        { status: 400 }
      );
    }
    return NextResponse.json({ url: data.url });
  }

  if (action === "upsert_google") {
    // Internal helper used by callback
    const { email, googleId, displayName, avatarUrl } = body;
    if (!email && !googleId) {
      return NextResponse.json({ error: "Missing Google profile" }, { status: 400 });
    }
    let user = googleId
      ? await prisma.user.findUnique({ where: { googleId } })
      : null;
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
    }
    if (!user) {
      const base =
        String(displayName || email || "member")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 24) || "member";
      let username = base;
      let n = 0;
      while (await prisma.user.findUnique({ where: { username } })) {
        n += 1;
        username = `${base}${n}`;
      }
      user = await prisma.user.create({
        data: {
          id: uid("ug"),
          username,
          displayName: String(displayName || "Google User").slice(0, 60),
          bio: "Joined with Google",
          avatarUrl:
            avatarUrl ||
            `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
          email: email || null,
          googleId: googleId || null,
          profilePublic: true,
          interests: ["community"],
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId || user.googleId,
          email: email || user.email,
          avatarUrl: avatarUrl || user.avatarUrl,
          displayName: displayName || user.displayName,
        },
      });
    }
    await setCurrentUserId(user.id);
    return NextResponse.json({ user: mapUser(user) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
