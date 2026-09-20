"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCard } from "@/components/UserCard";

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Parameters<typeof UserCard>[0]["user"][]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const d = await res.json();
    setSuggestions(d.suggestions || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Friend suggestions</h1>
        <p className="page-sub">Public profiles you might enjoy — follow or add as a friend.</p>
      </section>
      <div className="space-y-3">
        {suggestions.map((u) => (
          <UserCard key={u.id} user={u} onDone={load} />
        ))}
      </div>
    </div>
  );
}
