"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeedPost, PostCard } from "@/components/PostCard";

type Profile = {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl: string;
  profilePublic: boolean;
  locked?: boolean;
  location?: string;
  interests?: string[];
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
  rating?: number;
};

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<
    { id: string; body: string; post?: { id: string; title: string } | null }[]
  >([]);
  const [following, setFollowing] = useState<
    { id: string; displayName: string; username: string }[]
  >([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendship, setFriendship] = useState<{ status: string } | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [auth, data] = await Promise.all([
      fetch("/api/auth").then((r) => r.json()),
      fetch(`/api/users?id=${params.id}`).then((r) => r.json()),
    ]);
    setMeId(auth.user?.id || null);
    setUser(data.user || null);
    setPosts(data.posts || []);
    setComments(data.comments || []);
    setFollowing((data.following || []).filter(Boolean));
    setIsFollowing(!!data.isFollowing);
    setFriendship(data.friendship || null);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function social(action: "follow" | "friend") {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: params.id }),
    });
    const d = await res.json();
    if (!res.ok) {
      setNote(d.error || "Action failed");
      return;
    }
    setNote(action === "follow" ? "Follow updated" : "Friend request sent / updated");
    load();
  }

  if (!user) {
    return <p className="px-4 text-sm text-slate-500">Loading profile…</p>;
  }

  if (user.locked) {
    return (
      <div className="space-y-3 px-4 sm:px-0">
        <div className="card flex items-center gap-4 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#16324f]">{user.displayName}</h1>
            <p className="text-sm text-slate-500">@{user.username} · Private profile</p>
            <p className="mt-2 text-sm text-slate-600">
              This member keeps their profile private. You can only see full details if you are
              friends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <div className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full bg-sky-100" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-[#16324f]">{user.displayName}</h1>
            <p className="text-sm text-slate-500">
              @{user.username}
              {user.location ? ` · ${user.location}` : ""}
              {user.profilePublic ? " · Public" : " · Private"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{user.bio}</p>
            <p className="mt-2 text-xs text-slate-500">
              {user.followersCount} followers · {user.followingCount} following · {user.friendsCount}{" "}
              friends
              {user.rating != null ? ` · ★ ${user.rating.toFixed(1)}` : ""}
            </p>
            {user.interests?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.interests.map((i) => (
                  <span key={i} className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-800">
                    {i}
                  </span>
                ))}
              </div>
            ) : null}
            {meId !== user.id ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary text-sm" onClick={() => social("friend")}>
                  {friendship?.status === "accepted"
                    ? "Friends ✓"
                    : friendship?.status === "pending"
                      ? "Request pending"
                      : "Add friend"}
                </button>
                <button type="button" className="btn-secondary text-sm" onClick={() => social("follow")}>
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            ) : null}
            {note ? <p className="mt-2 text-xs text-sky-700">{note}</p> : null}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-[#16324f]">Posts</h2>
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={{ ...p, author: user }}
            meId={meId}
            onChanged={load}
          />
        ))}
        {!posts.length ? <p className="text-sm text-slate-500">No public posts yet.</p> : null}
      </section>

      {comments.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-[#16324f]">Comments</h2>
          {comments.slice(0, 12).map((c) => (
            <div key={c.id} className="card p-4 text-sm text-slate-700">
              {c.body}
              {c.post ? (
                <p className="mt-1 text-xs text-slate-400">on {c.post.title}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {following.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-[#16324f]">Following</h2>
          <div className="flex flex-wrap gap-2">
            {following.map((u) =>
              u ? (
                <a
                  key={u.id}
                  href={`/users/${u.id}`}
                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800"
                >
                  {u.displayName}
                </a>
              ) : null
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
