"use client";

import { FormEvent, useState } from "react";

export function CreatePost({
  topics,
  onCreated,
}: {
  topics: { id: string; name: string }[];
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState(topics[0]?.id || "t3");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, topicIds: [topicId], kind: "text" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setNote(d.error || "Could not post");
        return;
      }
      setTitle("");
      setBody("");
      setNote("Posted — external links are stripped automatically.");
      onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-[#16324f]">Create a post</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="field"
        required
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share text, thoughts, or describe media… (outbound links are removed)"
        className="field min-h-[96px]"
        required
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="field w-auto"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary ml-auto" disabled={busy}>
          Publish
        </button>
      </div>
      {note ? <p className="text-xs text-sky-700">{note}</p> : null}
    </form>
  );
}
