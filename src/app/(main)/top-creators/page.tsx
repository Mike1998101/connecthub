"use client";

import { useEffect, useState } from "react";
import { UserCard } from "@/components/UserCard";

type Creator = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  profilePublic: boolean;
  rating: number;
  followersCount: number;
  engagement?: number;
  activity?: number;
};

export default function TopCreatorsPage() {
  const [users, setUsers] = useState<Creator[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }, []);

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Popular creators</h1>
        <p className="page-sub">
          Most active and top-rated members based on post popularity and engagement.
        </p>
      </section>
      <div className="space-y-3">
        {users.map((u, i) => (
          <div key={u.id} className="relative">
            <span className="absolute -left-1 -top-2 z-10 rounded-full bg-[#16324f] px-2 py-0.5 text-xs font-bold text-white">
              #{i + 1}
            </span>
            <UserCard
              user={u}
              onDone={() =>
                fetch("/api/users")
                  .then((r) => r.json())
                  .then((d) => setUsers(d.users || []))
              }
            />
            <p className="px-4 pb-3 text-xs text-slate-500">
              Engagement score {u.engagement ?? 0} · {u.activity ?? 0} posts · ★ {u.rating.toFixed(1)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
