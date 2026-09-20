"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  postCount: number;
  color: string;
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []));
  }, []);

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Topic explorer</h1>
        <p className="page-sub">
          Browse categories to find music, shorts, creators, and community boards.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/?sort=topic&topic=${t.slug}`}
            className="card block p-5 transition hover:-translate-y-0.5"
          >
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ background: t.color }}
            >
              {t.postCount} posts
            </span>
            <h2 className="mt-3 font-display text-xl font-semibold text-[#16324f]">{t.name}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
