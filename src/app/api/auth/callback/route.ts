import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma, setCurrentUserId, uid } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message || "oauth_failed")}`
    );
  }

  const meta = data.user.user_metadata || {};
  const email = data.user.email || null;
  const googleId = data.user.id;
  const displayName =
    meta.full_name || meta.name || email?.split("@")[0] || "Google User";
  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(googleId)}`;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId }, ...(email ? [{ email }] : [])],
    },
  });

  if (!user) {
    const base =
      String(displayName)
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
        displayName: String(displayName).slice(0, 60),
        bio: "Joined with Google",
        avatarUrl,
        email,
        googleId,
        profilePublic: true,
        interests: ["community"],
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        email: email || user.email,
        avatarUrl: avatarUrl || user.avatarUrl,
        displayName: user.displayName || String(displayName).slice(0, 60),
      },
    });
  }

  await setCurrentUserId(user.id);
  return NextResponse.redirect(`${origin}/?welcome=google`);
}
