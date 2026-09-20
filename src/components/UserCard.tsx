"use client";

import Link from "next/link";
import { useState } from "react";

type UserLite = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  profilePublic?: boolean;
  rating?: number;
  followersCount?: number;
};

export function UserCard({
  user,
  showActions = true,
  onDone,
}: {
  user: UserLite;
  showActions?: boolean;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function social(action: "follow" | "friend") {
    setBusy(true);
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: user.id }),
      });
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex items-start gap-3 p-4">
      <Link href={`/users/${user.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full bg-sky-100" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/users/${user.id}`} className="font-semibold text-[#16324f] hover:underline">
          {user.displayName}
        </Link>
        <p className="text-xs text-slate-500">@{user.username}</p>
        {user.bio ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{user.bio}</p> : null}
        <div className="mt-1 flex gap-3 text-xs text-slate-500">
          {user.followersCount != null ? <span>{user.followersCount} followers</span> : null}
          {user.rating != null ? <span>★ {user.rating.toFixed(1)}</span> : null}
          {user.profilePublic === false ? <span>Private</span> : null}
        </div>
        {showActions ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="btn-primary text-xs"
              onClick={() => social("friend")}
            >
              Add friend
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-secondary text-xs"
              onClick={() => social("follow")}
            >
              Follow
            </button>
            <Link href={`/users/${user.id}`} className="btn-ghost text-xs">
              View profile
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
