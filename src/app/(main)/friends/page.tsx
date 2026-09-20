"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type LiteUser = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  profilePublic?: boolean;
  rating?: number;
  followersCount?: number;
};

export default function FriendsPage() {
  const [friends, setFriends] = useState<{ user?: LiteUser }[]>([]);
  const [pending, setPending] = useState<{ friendship: { id: string }; user?: LiteUser }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const d = await res.json();
    setFriends(d.friends || []);
    setPending(d.pending || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function accept(id: string) {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_friend", friendshipId: id }),
    });
    load();
  }

  async function social(userId: string, action: "follow" | "friend") {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    load();
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Friends</h1>
        <p className="page-sub">Accepted friends and incoming requests.</p>
      </section>

      {pending.length ? (
        <section className="space-y-2">
          <h2 className="font-semibold text-[#16324f]">Requests</h2>
          {pending.map((p) =>
            p.user ? (
              <div key={p.friendship.id} className="card flex items-center gap-3 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.user.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Link href={`/users/${p.user.id}`} className="font-semibold text-[#16324f]">
                    {p.user.displayName}
                  </Link>
                  <p className="text-xs text-slate-500">@{p.user.username}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary shrink-0 text-sm"
                  onClick={() => accept(p.friendship.id)}
                >
                  Accept
                </button>
              </div>
            ) : null
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold text-[#16324f]">Your friends</h2>
        {friends.map((f) =>
          f.user ? (
            <div key={f.user.id} className="card flex items-start gap-3 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.user.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <Link href={`/users/${f.user.id}`} className="font-semibold text-[#16324f]">
                  {f.user.displayName}
                </Link>
                <p className="text-xs text-slate-500">@{f.user.username}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => social(f.user!.id, "follow")}
                  >
                    Follow
                  </button>
                  <Link href={`/users/${f.user.id}`} className="btn-ghost text-xs">
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          ) : null
        )}
        {!friends.length ? (
          <p className="text-sm text-slate-500">No friends yet — try Suggestions.</p>
        ) : null}
      </section>
    </div>
  );
}
