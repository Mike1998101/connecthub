"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FeedPost, PostCard } from "@/components/PostCard";
import { SearchBar } from "@/components/SearchBar";
import { RecommendRail } from "@/components/RecommendRail";

function SearchInner() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [authors, setAuthors] = useState<
    Record<string, { displayName: string; avatarUrl: string }>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      fetch("/api/auth").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([search, auth, users]) => {
      setPosts(search.posts || []);
      setMeId(auth.user?.id || null);
      const map: Record<string, { displayName: string; avatarUrl: string }> = {};
      for (const u of users.users || []) {
        map[u.id] = { displayName: u.displayName, avatarUrl: u.avatarUrl };
      }
      setAuthors(map);
      setLoading(false);
    });
  }, [q]);

  return (
    <div className="space-y-4">
      <section className="px-4 sm:px-0">
        <h1 className="page-title">Search</h1>
        <p className="page-sub">
          Find posts, music, shorts, and articles — results include images and in-app video.
        </p>
        <div className="mt-3 max-w-xl">
          <SearchBar />
        </div>
      </section>
      {q ? (
        <p className="px-4 text-sm text-slate-500 sm:px-0">
          {loading ? "Searching…" : `${posts.length} results for “${q}”`}
        </p>
      ) : null}
      <RecommendRail />
      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} id={`post-${p.id}`}>
            <PostCard post={p} meId={meId} authors={authors} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="px-4 text-sm text-slate-500">Loading search…</p>}>
      <SearchInner />
    </Suspense>
  );
}
