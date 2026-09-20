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
  const [imageUrl, setImageUrl] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square" | "">("");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  function detectFromUrl(url: string) {
    if (!url) {
      setOrientation("");
      setDims(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setDims({ w, h });
      const ratio = w / h;
      if (ratio < 0.85) setOrientation("portrait");
      else if (ratio > 1.15) setOrientation("landscape");
      else setOrientation("square");
    };
    img.onerror = () => {
      setNote("Could not read image dimensions — posting as landscape.");
      setOrientation("landscape");
    };
    img.src = url;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    try {
      const kind = imageUrl ? "image" : "text";
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          topicIds: [topicId],
          kind,
          imageUrls: imageUrl ? [imageUrl] : undefined,
          media: imageUrl
            ? {
                title,
                description: body.slice(0, 400),
                width: dims?.w,
                height: dims?.h,
                orientation: orientation || "landscape",
                thumbnailUrl: imageUrl,
                tags: ["community"],
              }
            : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setNote(d.error || "Could not post");
        return;
      }
      setTitle("");
      setBody("");
      setImageUrl("");
      setOrientation("");
      setDims(null);
      setNote(
        orientation
          ? `Posted as ${orientation} media — external links stripped.`
          : "Posted — external links are stripped automatically."
      );
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
      <input
        value={imageUrl}
        onChange={(e) => {
          setImageUrl(e.target.value);
          detectFromUrl(e.target.value.trim());
        }}
        placeholder="Optional image URL (orientation auto-detected)"
        className="field"
      />
      {orientation ? (
        <p className="text-xs text-sky-700">
          Detected <strong>{orientation}</strong>
          {dims ? ` · ${dims.w}×${dims.h}` : ""} — will display full-bleed on phones.
        </p>
      ) : null}
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
