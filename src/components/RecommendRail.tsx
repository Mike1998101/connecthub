"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FeedPost } from "./PostCard";

export function RecommendRail({ kind }: { kind?: string }) {
  const [items, setItems] = useState<FeedPost[]>([]);

  useEffect(() => {
    const q = kind ? `?kind=${kind}` : "";
    fetch(`/api/recommend${q}`)
      .then((r) => r.json())
      .then((d) => setItems(d.posts || []))
      .catch(() => null);
  }, [kind]);

  if (!items.length) return null;

  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-sky-100 bg-gradient-to-r from-[#e8f4ef] to-[#eef6fb] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6b5a]">
          Recommended for you
        </p>
        <p className="text-sm text-slate-600">Based on what you search, read, and watch</p>
      </div>
      <ul className="divide-y divide-sky-50">
        {items.slice(0, 6).map((p) => (
          <li key={p.id}>
            <Link
              href={`/?focus=${p.id}${p.kind === "short" ? "" : ""}`}
              className="flex gap-3 px-4 py-3 hover:bg-sky-50/60"
            >
              {p.media?.thumbnailUrl || p.imageUrls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.media?.thumbnailUrl || p.imageUrls![0]}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-14 w-20 shrink-0 rounded-lg bg-sky-100" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#16324f]">{p.title}</p>
                <p className="text-xs text-slate-500">
                  {p.kind}
                  {p.media?.artist ? ` · ${p.media.artist}` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
