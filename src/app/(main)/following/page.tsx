"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCard } from "@/components/UserCard";

export default function FollowingPage() {
  const [following, setFollowing] = useState<Parameters<typeof UserCard>[0]["user"][]>([]);
  const [followers, setFollowers] = useState<Parameters<typeof UserCard>[0]["user"][]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const d = await res.json();
    setFollowing(d.following || []);
    setFollowers(d.followers || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Following</h1>
        <p className="page-sub">People you follow and members following you.</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-[#16324f]">You follow</h2>
        {following.map((u) => (u ? <UserCard key={u.id} user={u} onDone={load} /> : null))}
        {!following.length ? <p className="text-sm text-slate-500">Not following anyone yet.</p> : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-[#16324f]">Followers</h2>
        {followers.map((u) => (u ? <UserCard key={u.id} user={u} onDone={load} /> : null))}
      </section>
    </div>
  );
}
