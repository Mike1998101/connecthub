"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedPost, PostCard } from "@/components/PostCard";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const auth = await fetch("/api/auth").then((r) => r.json());
    setMeId(auth.user?.id || null);
    const res = await fetch("/api/bookmarks");
    if (!res.ok) {
      setError("Log in to view saved posts.");
      setPosts([]);
      return;
    }
    const data = await res.json();
    setError("");
    setPosts(data.posts || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Saved posts</h1>
        <p className="page-sub">Bookmarks from across the platform — manage them anytime.</p>
      </section>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} meId={meId} onChanged={load} />
        ))}
        {!error && !posts.length ? (
          <p className="text-sm text-slate-500">No saved posts yet. Tap ☆ Save on any post.</p>
        ) : null}
      </div>
    </div>
  );
}
