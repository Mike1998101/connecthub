"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Note = {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
  type: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const d = await res.json();
    setItems(d.notifications || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    load();
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            Friend requests, message requests, incoming messages, follows, and comments.
          </p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={markAll}>
          Mark all read
        </button>
      </section>
      <div className="space-y-2">
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            className={`card block p-4 ${n.read ? "opacity-70" : "ring-1 ring-sky-200"}`}
            onClick={() =>
              fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "read", id: n.id }),
              })
            }
          >
            <p className="text-xs font-bold uppercase tracking-wide text-sky-600">{n.type}</p>
            <p className="font-semibold text-[#16324f]">{n.title}</p>
            <p className="text-sm text-slate-600">{n.body}</p>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </Link>
        ))}
        {!items.length ? <p className="text-sm text-slate-500">You&apos;re all caught up.</p> : null}
      </div>
    </div>
  );
}
