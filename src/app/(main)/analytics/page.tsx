"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  title: string;
  upvotes: number;
  commentCount: number;
  likes: number;
  author?: { displayName: string; id: string };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<{
    totals: { posts: number; upvotes: number; comments: number };
    mostUpvoted: Row[];
    mostCommented: Row[];
    detailsFetched: string[];
    detailsToFetch: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="px-4 text-sm text-slate-500">Loading trending reports…</p>;
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Trending reports</h1>
        <p className="page-sub">Most upvoted and commented posts over the last week.</p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Posts", data.totals.posts],
          ["Upvotes", data.totals.upvotes],
          ["Comments", data.totals.comments],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4 text-center">
            <p className="text-2xl font-bold text-[#16324f]">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <Report title="Most upvoted" rows={data.mostUpvoted} metric="upvotes" />
      <Report title="Most commented" rows={data.mostCommented} metric="commentCount" />

      <div className="card p-4 text-sm text-slate-600">
        <p className="font-semibold text-[#16324f]">Metadata</p>
        <p className="mt-1">Fetched: {data.detailsFetched.join(", ")}</p>
        <p className="mt-1">Queued to fetch: {data.detailsToFetch.join(", ")}</p>
      </div>
    </div>
  );
}

function Report({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: Row[];
  metric: "upvotes" | "commentCount";
}) {
  return (
    <section className="card p-4">
      <h2 className="font-display text-lg font-semibold text-[#16324f]">{title}</h2>
      <ol className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl bg-sky-50/70 px-3 py-2">
            <span className="w-6 text-sm font-bold text-slate-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link href={`/?focus=${r.id}`} className="font-medium text-[#16324f] hover:underline">
                {r.title}
              </Link>
              <p className="text-xs text-slate-500">
                {r.author?.displayName || "Member"} · {r[metric]} {metric === "upvotes" ? "upvotes" : "comments"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
