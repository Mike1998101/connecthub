"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedPost, PostCard } from "@/components/PostCard";
import { RecommendRail } from "@/components/RecommendRail";

export default function ShortsPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [authors, setAuthors] = useState<
    Record<string, { displayName: string; avatarUrl: string }>
  >({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [feed, auth, users] = await Promise.all([
      fetch("/api/posts?kind=short&sort=trending").then((r) => r.json()),
      fetch("/api/auth").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setPosts(feed.posts || []);
    setMeId(auth.user?.id || null);
    const map: Record<string, { displayName: string; avatarUrl: string }> = {};
    for (const u of users.users || []) {
      map[u.id] = { displayName: u.displayName, avatarUrl: u.avatarUrl };
    }
    setAuthors(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <section className="px-4 sm:px-0">
        <h1 className="page-title">Shorts</h1>
        <p className="page-sub">
          Vertical clips only — full-bleed on phone, YouTube branding hidden, play and discuss here.
        </p>
      </section>
      <RecommendRail kind="short" />
      {loading ? <p className="px-4 text-sm text-slate-500">Loading shorts…</p> : null}
      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} id={`post-${p.id}`}>
            <PostCard post={p} meId={meId} authors={authors} onChanged={load} />
          </div>
        ))}
        {!loading && !posts.length ? (
          <p className="px-4 text-sm text-slate-500">
            No shorts yet — run Curate now from the sidebar.
          </p>
        ) : null}
      </div>
    </div>
  );
}
