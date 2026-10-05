"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserPrefs } from "@/lib/activity";

type Analytics = {
  postsThisWeek: number;
  myPosts: number;
  views: number;
  engagement: number;
  followers: number;
  following: number;
  friends: number;
  byKind: Record<string, number>;
  topPosts: Array<{
    id: string;
    title: string;
    kind: string;
    upvotes: number;
    comments: number;
    thumbnail?: string;
  }>;
  topics: number;
  groups: string[];
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "posts", label: "Posts" },
  { id: "stories", label: "Stories" },
  { id: "reception", label: "Reception" },
  { id: "analytics", label: "Analytics" },
  { id: "content", label: "Content" },
  { id: "community", label: "Community" },
  { id: "settings", label: "Settings" },
  { id: "birthdays", label: "Birthdays" },
  { id: "events", label: "Events" },
  { id: "pages", label: "Pages" },
  { id: "memories", label: "Memories" },
  { id: "help", label: "Help" },
] as const;

export default function DashboardPage() {
  const [section, setSection] = useState<string>("overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function load() {
    const d = await fetch("/api/dashboard").then((r) => r.json());
    setAnalytics(d.analytics);
    setPrefs(d.prefs);
    setMe(d.me);
  }

  useEffect(() => {
    load();
  }, []);

  async function savePrefs(patch: UserPrefs) {
    const res = await fetch("/api/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: { ...prefs, ...patch } }),
    });
    const d = await res.json();
    if (!res.ok) {
      setNote(d.error || "Login required to save preferences");
      return;
    }
    setPrefs(d.prefs);
    setNote("Preferences saved");
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">
          Analytics, reception, content tools, and account settings — all in one place.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`nav-chip shrink-0 ${section === s.id ? "nav-chip-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {note ? <p className="text-sm text-sky-800">{note}</p> : null}

      {section === "overview" || section === "analytics" || section === "reception" || section === "content" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Views (proxy)", value: analytics?.views ?? "—" },
            { label: "Engagement", value: analytics?.engagement ?? "—" },
            { label: "Followers", value: analytics?.followers ?? "—" },
            { label: "Friends", value: analytics?.friends ?? "—" },
            { label: "My posts", value: analytics?.myPosts ?? "—" },
            { label: "Posts this week", value: analytics?.postsThisWeek ?? "—" },
            { label: "Following", value: analytics?.following ?? "—" },
            { label: "Topics", value: analytics?.topics ?? "—" },
          ].map((c) => (
            <div key={c.label} className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[#16324f]">{c.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {(section === "overview" || section === "posts" || section === "content") && analytics ? (
        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold text-[#16324f]">Content mix</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(analytics.byKind).map(([k, v]) => (
              <span key={k} className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800">
                {k}: {v}
              </span>
            ))}
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-600">Top posts</h3>
          <ul className="mt-2 space-y-2">
            {analytics.topPosts.map((p) => (
              <li key={p.id}>
                <Link href={`/?focus=${p.id}`} className="flex items-center gap-3 rounded-xl hover:bg-sky-50">
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-16 rounded-lg bg-sky-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-slate-500">
                      {p.kind} · ▲{p.upvotes} · 💬{p.comments}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {section === "stories" ? (
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Stories</h2>
          <p className="text-sm text-slate-600">
            24-hour ephemeral updates from people you follow. Visibility defaults to friends.
          </p>
          <label className="flex items-center gap-2 text-sm">
            Stories audience
            <select
              className="field"
              value={prefs?.storiesVisibility || "friends"}
              onChange={(e) => savePrefs({ storiesVisibility: e.target.value })}
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="followers">Followers</option>
            </select>
          </label>
        </div>
      ) : null}

      {section === "community" ? (
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Community</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/friends" className="btn-secondary text-sm">Friends</Link>
            <Link href="/suggestions" className="btn-secondary text-sm">Suggestions</Link>
            <Link href="/following" className="btn-secondary text-sm">Following</Link>
            <Link href="/chat" className="btn-secondary text-sm">Chat</Link>
            <Link href="/guidelines" className="btn-secondary text-sm">Guidelines</Link>
            <Link href="/top-creators" className="btn-secondary text-sm">Top creators</Link>
          </div>
          <p className="text-sm text-slate-600">
            Source groups curated: {(analytics?.groups || []).join(" · ") || "—"}
          </p>
        </div>
      ) : null}

      {section === "settings" ? (
        <div className="space-y-4">
          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Tools & resources</h2>
            <label className="flex items-center justify-between gap-3 text-sm">
              Privacy checkup done
              <input
                type="checkbox"
                checked={!!prefs?.privacyCheckupDone}
                onChange={(e) => savePrefs({ privacyCheckupDone: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              Family center
              <input
                type="checkbox"
                checked={!!prefs?.familyCenterEnabled}
                onChange={(e) => savePrefs({ familyCenterEnabled: e.target.checked })}
              />
            </label>
            <label className="block text-sm">
              Default audience
              <select
                className="field mt-1"
                value={prefs?.defaultAudience || "public"}
                onChange={(e) =>
                  savePrefs({ defaultAudience: e.target.value as UserPrefs["defaultAudience"] })
                }
              >
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="followers">Followers</option>
              </select>
            </label>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Preferences</h2>
            <label className="flex items-center justify-between gap-3 text-sm">
              Dark mode
              <input
                type="checkbox"
                checked={!!prefs?.darkMode}
                onChange={(e) => savePrefs({ darkMode: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              Media autoplay
              <input
                type="checkbox"
                checked={prefs?.mediaAutoplay !== false}
                onChange={(e) => savePrefs({ mediaAutoplay: e.target.checked })}
              />
            </label>
            <label className="block text-sm">
              Language
              <select
                className="field mt-1"
                value={prefs?.language || "en"}
                onChange={(e) => savePrefs({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </label>
            <label className="block text-sm">
              Region
              <input
                className="field mt-1"
                value={prefs?.region || "US"}
                onChange={(e) => savePrefs({ region: e.target.value })}
              />
            </label>
            <p className="text-xs text-slate-500">
              Notifications: likes, comments, follows, friend requests, messages — toggled via prefs API.
            </p>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Audience & visibility</h2>
            <label className="flex items-center justify-between gap-3 text-sm">
              Profile locking
              <input
                type="checkbox"
                checked={!!prefs?.profileLocking}
                onChange={(e) => savePrefs({ profileLocking: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              Profile details public
              <input
                type="checkbox"
                checked={prefs?.profileDetailsPublic !== false}
                onChange={(e) => savePrefs({ profileDetailsPublic: e.target.checked })}
              />
            </label>
            <label className="block text-sm">
              How people can find you
              <select
                className="field mt-1"
                value={prefs?.howPeopleFindYou || "everyone"}
                onChange={(e) =>
                  savePrefs({ howPeopleFindYou: e.target.value as UserPrefs["howPeopleFindYou"] })
                }
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends</option>
                <option value="nobody">Nobody</option>
              </select>
            </label>
            {(["postsVisibility", "storiesVisibility", "shortsVisibility"] as const).map((key) => (
              <label key={key} className="block text-sm capitalize">
                {key.replace("Visibility", " visibility")}
                <select
                  className="field mt-1"
                  value={(prefs?.[key] as string) || "public"}
                  onChange={(e) => savePrefs({ [key]: e.target.value })}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="followers">Followers</option>
                </select>
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 text-sm">
              Follower & public content
              <input
                type="checkbox"
                checked={prefs?.followerPublicContent !== false}
                onChange={(e) => savePrefs({ followerPublicContent: e.target.checked })}
              />
            </label>
            <label className="block text-sm">
              Profile tagging
              <select
                className="field mt-1"
                value={prefs?.profileTagging || "friends"}
                onChange={(e) =>
                  savePrefs({ profileTagging: e.target.value as UserPrefs["profileTagging"] })
                }
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends</option>
                <option value="off">Off</option>
              </select>
            </label>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-display text-lg font-semibold">Your activity</h2>
            <p className="text-sm text-slate-600">
              Apps and websites · Business integrations — managed per account. Search and watch history
              powers recommendations on the feed and Shorts.
            </p>
            <Link href="/settings" className="btn-secondary inline-block text-sm">
              Ingest schedule & visibility
            </Link>
          </div>

          <div className="card space-y-2 p-5">
            <h2 className="font-display text-lg font-semibold">Community standards & legal</h2>
            <Link href="/guidelines" className="block text-sm text-sky-800 hover:underline">
              Community standards
            </Link>
            <Link href="/guidelines#terms" className="block text-sm text-sky-800 hover:underline">
              Terms of service
            </Link>
            <Link href="/guidelines#privacy" className="block text-sm text-sky-800 hover:underline">
              Privacy policy
            </Link>
            <Link href="/guidelines#cookies" className="block text-sm text-sky-800 hover:underline">
              Cookies policy
            </Link>
          </div>
        </div>
      ) : null}

      {section === "birthdays" ? (
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold">Birthdays</h2>
          <p className="mt-2 text-sm text-slate-600">
            Upcoming birthdays from friends appear here when contacts share that detail.
          </p>
        </div>
      ) : null}

      {section === "events" ? (
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold">Events</h2>
          <p className="mt-2 text-sm text-slate-600">
            Community listening nights and creator AMAs — create from Chat → Group.
          </p>
        </div>
      ) : null}

      {section === "pages" ? (
        <div className="card space-y-2 p-5">
          <h2 className="font-display text-lg font-semibold">Pages</h2>
          <Link href="/topics" className="block text-sm text-sky-800">Topic explorer</Link>
          <Link href="/analytics" className="block text-sm text-sky-800">Trending reports</Link>
          <Link href="/bookmarks" className="block text-sm text-sky-800">Saved posts</Link>
          <Link href="/top-creators" className="block text-sm text-sky-800">Popular creators</Link>
          <Link href="/profile" className="block text-sm text-sky-800">Your profile</Link>
        </div>
      ) : null}

      {section === "memories" ? (
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold">Memories</h2>
          <p className="mt-2 text-sm text-slate-600">
            On this day — highlights from your older posts and music saves.
          </p>
          {!me ? <p className="mt-2 text-sm text-amber-700">Login to see your memories.</p> : null}
        </div>
      ) : null}

      {section === "help" ? (
        <div className="card space-y-2 p-5">
          <h2 className="font-display text-lg font-semibold">Help & support</h2>
          <p className="text-sm text-slate-600">
            Report issues from any post menu, review guidelines, or contact admins via peer chat.
          </p>
          <Link href="/guidelines" className="btn-primary inline-block text-sm">
            Community guidelines
          </Link>
        </div>
      ) : null}
    </div>
  );
}
