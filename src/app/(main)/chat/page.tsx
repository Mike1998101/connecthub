"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Thread = {
  id: string;
  type: "peer" | "group";
  title: string;
  lastPreview: string;
  lastMessageAt: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender?: { displayName: string };
};

function ChatInner() {
  const params = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(params.get("thread"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [groupTitle, setGroupTitle] = useState("Weekend hangout");

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/chat");
    if (!res.ok) return;
    const d = await res.json();
    setThreads(d.threads || []);
    if (!active && d.threads?.[0]) setActive(d.threads[0].id);
  }, [active]);

  const loadMessages = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/chat?threadId=${threadId}`);
    if (!res.ok) return;
    const d = await res.json();
    setMessages(d.messages || []);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (active) loadMessages(active);
  }, [active, loadMessages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", threadId: active, body: text }),
    });
    setText("");
    loadMessages(active);
    loadThreads();
  }

  async function create(type: "peer" | "group") {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        type,
        title: type === "group" ? groupTitle : "Direct chat",
        memberIds: type === "group" ? ["u1", "u3"] : ["u1"],
      }),
    });
    const d = await res.json();
    setActive(d.thread.id);
    loadThreads();
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Chat</h1>
        <p className="page-sub">Peer-to-peer DMs and peer-to-group rooms — stay on ConnectHub.</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-sm" onClick={() => create("peer")}>
          New peer chat
        </button>
        <input
          className="field max-w-[200px]"
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
          placeholder="Group name"
        />
        <button type="button" className="btn-secondary text-sm" onClick={() => create("group")}>
          New group chat
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="card divide-y divide-sky-50 p-2">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`w-full rounded-xl px-3 py-3 text-left ${
                active === t.id ? "bg-sky-100" : "hover:bg-sky-50"
              }`}
            >
              <p className="text-sm font-semibold text-[#16324f]">
                {t.title}{" "}
                <span className="text-[10px] font-bold uppercase text-sky-600">{t.type}</span>
              </p>
              <p className="truncate text-xs text-slate-500">{t.lastPreview}</p>
            </button>
          ))}
          {!threads.length ? (
            <p className="p-3 text-sm text-slate-500">No chats yet — create one above.</p>
          ) : null}
        </aside>

        <section className="card flex min-h-[420px] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className="rounded-2xl bg-sky-50 px-3 py-2">
                <p className="text-xs font-semibold text-sky-800">
                  {m.sender?.displayName || "Member"}
                </p>
                <p className="text-sm text-slate-700">{m.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-sky-100 p-3">
            <input
              className="field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message…"
            />
            <button type="submit" className="btn-primary shrink-0">
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p className="px-4 text-sm text-slate-500">Loading chat…</p>}>
      <ChatInner />
    </Suspense>
  );
}
