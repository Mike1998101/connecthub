"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreatePost } from "@/components/CreatePost";
import { FeedPost, PostCard } from "@/components/PostCard";

type Topic = { id: string; name: string; slug: string; color: string };

export default function HomeClient() {
  const params = useSearchParams();
  const sort = params.get("sort") || "chronological";
  const topic = params.get("topic") || "";
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [authors, setAuthors] = useState<
    Record<string, { displayName: string; avatarUrl: string }>
  >({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ sort });
    if (topic) q.set("topic", topic);
    const [feed, topicRes, auth, users] = await Promise.all([
      fetch(`/api/posts?${q}`).then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
      fetch("/api/auth").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setPosts(feed.posts || []);
    setTopics(topicRes.topics || []);
    setMeId(auth.user?.id || null);
    const map: Record<string, { displayName: string; avatarUrl: string }> = {};
    for (const u of users.users || []) {
      map[u.id] = { displayName: u.displayName, avatarUrl: u.avatarUrl };
    }
    setAuthors(map);
    setLoading(false);
  }, [sort, topic]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = useMemo(
    () => [
      { id: "chronological", label: "Latest", href: "/" },
      { id: "trending", label: "Trending", href: "/?sort=trending" },
      { id: "topic", label: "By topic", href: "/?sort=topic" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <section className="px-4 sm:px-0">
        <h1 className="page-title rise-in">Community feed</h1>
        <p className="page-sub">
          Shorts and music play in-app. External links are stripped so conversations stay on
          ConnectHub.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto px-4 sm:px-0">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={t.href}
            className={`nav-chip ${sort === t.id ? "nav-chip-active" : ""}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {sort === "topic" || topic ? (
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-0">
          {topics.map((t) => (
            <a
              key={t.id}
              href={`/?sort=topic&topic=${t.slug}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                topic === t.slug ? "ring-2 ring-offset-2 ring-[#16324f]" : "opacity-90"
              }`}
              style={{ background: t.color }}
            >
              {t.name}
            </a>
          ))}
        </div>
      ) : null}

      <div className="px-4 sm:px-0">
        <CreatePost topics={topics} onCreated={load} />
      </div>

      {loading ? (
        <p className="px-4 text-sm text-slate-500">Loading feed…</p>
      ) : (
        <div className="space-y-4">
          {posts.map((p, i) => (
            <div
              key={p.id}
              className="rise-in"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <PostCard post={p} meId={meId} authors={authors} onChanged={load} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
