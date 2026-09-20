"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const primaryNav = [
  { href: "/", label: "Feed" },
  { href: "/topics", label: "Topics" },
  { href: "/analytics", label: "Trending" },
  { href: "/top-creators", label: "Creators" },
  { href: "/guidelines", label: "Guidelines" },
];

const socialNav = [
  { href: "/friends", label: "Friends" },
  { href: "/suggestions", label: "Suggestions" },
  { href: "/following", label: "Following" },
  { href: "/chat", label: "Chat" },
  { href: "/notifications", label: "Alerts" },
  { href: "/bookmarks", label: "Saved" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/login", label: "Login" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<{ displayName: string; avatarUrl: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setMe(d.user || null))
      .catch(() => null);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setUnread(d.unread || 0))
      .catch(() => null);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-sky-100/80 bg-[#eef6fb]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-[#16324f]">
            ConnectHub
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {primaryNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`nav-chip ${pathname === n.href ? "nav-chip-active" : ""}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/notifications" className="relative rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
            Alerts
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            {me ? me.displayName.split(" ")[0] : "Login"}
          </Link>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-sky-100/60 px-3 py-2 md:hidden">
          {[...primaryNav, ...socialNav].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-chip shrink-0 ${pathname === n.href ? "nav-chip-active" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-0 py-4 sm:px-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 space-y-1 p-3">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Social
            </p>
            {socialNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-xl px-3 py-2 text-sm font-medium ${
                  pathname === n.href
                    ? "bg-sky-100 text-[#16324f]"
                    : "text-slate-600 hover:bg-sky-50"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <button
              type="button"
              className="btn-secondary mt-3 w-full text-sm"
              onClick={() =>
                fetch("/api/youtube/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "daily", limit: 5 }),
                }).then(async (r) => {
                  const d = await r.json();
                  if (!r.ok) alert(d.error || "Admin only");
                  else window.location.reload();
                })
              }
            >
              Run daily curation
            </button>
            <Link href="/settings" className="btn-ghost mt-1 block w-full text-center text-sm">
              Schedule & visibility
            </Link>
          </div>
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
