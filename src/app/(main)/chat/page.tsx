"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Thread = {
  id: string;
  type: "peer" | "group";
  title: string;
  lastPreview: string;
  lastMessageAt: string;
  status: "open" | "request";
  memberIds: string[];
  requestedBy?: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender?: { displayName: string };
};

type LiteUser = { id: string; displayName: string; username: string };

function ChatInner() {
  const params = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(params.get("thread"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<LiteUser[]>([]);
  const [allUsers, setAllUsers] = useState<LiteUser[]>([]);
  const [text, setText] = useState("");
  const [groupTitle, setGroupTitle] = useState("Weekend hangout");
  const [addUserId, setAddUserId] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const activeThread = threads.find((t) => t.id === active) || null;

  const loadThreads = useCallback(async () => {
    const [chatRes, auth, users] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/auth").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setMeId(auth.user?.id || null);
    setAllUsers(
      (users.users || []).map((u: LiteUser & { id: string }) => ({
        id: u.id,
        displayName: u.displayName,
        username: u.username,
      }))
    );
    if (!chatRes.ok) return;
    const d = await chatRes.json();
    setThreads(d.threads || []);
    if (!active && d.threads?.[0]) setActive(d.threads[0].id);
  }, [active]);

  const loadMessages = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/chat?threadId=${threadId}`);
    if (!res.ok) return;
    const d = await res.json();
    setMessages(d.messages || []);
    setMembers((d.members || []).filter(Boolean));
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
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", threadId: active, body: text }),
    });
    const d = await res.json();
    if (!res.ok) {
      setNote(d.error || "Could not send");
      return;
    }
    setText("");
    setNote("");
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

  async function acceptRequest() {
    if (!active) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_request", threadId: active }),
    });
    loadThreads();
    loadMessages(active);
  }

  async function addMember() {
    if (!active || !addUserId) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_member", threadId: active, userId: addUserId }),
    });
    setAddUserId("");
    loadMessages(active);
    loadThreads();
  }

  async function removeMember(userId: string) {
    if (!active) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_member", threadId: active, userId }),
    });
    loadMessages(active);
    loadThreads();
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Chat</h1>
        <p className="page-sub">
          Peer DMs (friends open instantly; others send a message request) and group rooms with
          adjustable members.
        </p>
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
                {t.status === "request" ? (
                  <span className="ml-1 text-[10px] font-bold uppercase text-amber-600">
                    request
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-slate-500">{t.lastPreview}</p>
            </button>
          ))}
          {!threads.length ? (
            <p className="p-3 text-sm text-slate-500">No chats yet — create one above.</p>
          ) : null}
        </aside>

        <section className="card flex min-h-[420px] flex-col">
          {activeThread?.status === "request" && activeThread.requestedBy !== meId ? (
            <div className="flex items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">Incoming message request</p>
              <button type="button" className="btn-primary text-sm" onClick={acceptRequest}>
                Accept
              </button>
            </div>
          ) : null}

          {activeThread?.type === "group" ? (
            <div className="space-y-2 border-b border-sky-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Members ({members.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs"
                  >
                    {m.displayName}
                    {m.id !== meId ? (
                      <button
                        type="button"
                        className="font-bold text-rose-500"
                        onClick={() => removeMember(m.id)}
                        aria-label={`Remove ${m.displayName}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  className="field"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                >
                  <option value="">Add member…</option>
                  {allUsers
                    .filter((u) => !members.some((m) => m.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                      </option>
                    ))}
                </select>
                <button type="button" className="btn-secondary shrink-0 text-sm" onClick={addMember}>
                  Add
                </button>
              </div>
            </div>
          ) : null}

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
          {note ? <p className="px-3 pb-3 text-xs text-rose-600">{note}</p> : null}
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
