"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  function submit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={submit} className={`flex items-center gap-2 ${className}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts, music, shorts…"
        className="field min-w-0 flex-1 py-1.5 text-sm"
        aria-label="Search ConnectHub"
      />
      <button type="submit" className="btn-primary shrink-0 px-3 py-1.5 text-sm">
        Search
      </button>
    </form>
  );
}
