"use client";

import { FormEvent, useEffect, useState } from "react";
import { FeedPost, PostCard } from "@/components/PostCard";

type User = {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  profilePublic: boolean;
  location?: string;
  interests: string[];
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  postsCount: number;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [saved, setSaved] = useState(false);

  async function load() {
    const auth = await fetch("/api/auth").then((r) => r.json());
    if (!auth.user) {
      setUser(null);
      return;
    }
    const data = await fetch(`/api/users?id=${auth.user.id}`).then((r) => r.json());
    setUser(data.user);
    setPosts(data.posts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: user.displayName,
        bio: user.bio,
        location: user.location,
        profilePublic: user.profilePublic,
        interests: user.interests,
      }),
    });
    setSaved(true);
    load();
  }

  if (!user) {
    return (
      <div className="px-4">
        <h1 className="page-title">Your profile</h1>
        <p className="page-sub">
          <a href="/login" className="font-semibold text-sky-700 underline">
            Log in
          </a>{" "}
          to manage your account and post history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Your profile</h1>
        <p className="page-sub">Post history, account details, and privacy controls.</p>
      </section>

      <form onSubmit={save} className="card space-y-3 p-5">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full" />
          <div>
            <p className="font-semibold text-[#16324f]">@{user.username}</p>
            <p className="text-sm text-slate-500">
              {user.postsCount} posts · {user.followersCount} followers · {user.friendsCount} friends
            </p>
          </div>
        </div>
        <label className="block text-sm font-medium">
          Display name
          <input
            className="field mt-1"
            value={user.displayName}
            onChange={(e) => setUser({ ...user, displayName: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium">
          Bio
          <textarea
            className="field mt-1 min-h-[88px]"
            value={user.bio}
            onChange={(e) => setUser({ ...user, bio: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium">
          Location
          <input
            className="field mt-1"
            value={user.location || ""}
            onChange={(e) => setUser({ ...user, location: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={user.profilePublic}
            onChange={(e) => setUser({ ...user, profilePublic: e.target.checked })}
          />
          Public profile (others can view, follow, and add as friend)
        </label>
        <label className="block text-sm font-medium">
          Interests (comma separated)
          <input
            className="field mt-1"
            value={user.interests.join(", ")}
            onChange={(e) =>
              setUser({
                ...user,
                interests: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <button type="submit" className="btn-primary">
          Save account details
        </button>
        {saved ? <p className="text-xs text-sky-700">Saved.</p> : null}
      </form>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-[#16324f]">Your posts</h2>
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={{ ...p, author: user }}
              meId={user.id}
              onChanged={load}
            />
          ))}
          {!posts.length ? <p className="text-sm text-slate-500">No posts yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
