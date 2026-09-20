"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { MediaEmbed } from "./MediaEmbed";

export type FeedPost = {
  id: string;
  kind: string;
  title: string;
  body: string;
  upvotes: number;
  downvotes: number;
  likes: number;
  commentCount: number;
  createdAt: string;
  imageUrls?: string[];
  sourceGroup?: string;
  sourcePlatform?: string;
  clusterId?: string;
  media?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    artist?: string;
    album?: string;
    genre?: string;
    durationSec?: number;
    publishedAt?: string;
    viewCount?: number;
    likeCount?: number;
    tags?: string[];
    thumbnailUrl?: string;
    youtubeVideoId?: string;
    width?: number;
    height?: number;
    orientation?: "portrait" | "landscape" | "square";
  };
  bookmarkedBy: string[];
  likedBy: string[];
  voters: Record<string, 1 | -1>;
  author?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  };
  topics?: { id: string; name: string; slug: string; color: string }[];
  comments?: NestedComment[];
  similar?: FeedPost[];
};

type NestedComment = {
  id: string;
  body: string;
  createdAt: string;
  upvotes: number;
  authorId: string;
  replies?: NestedComment[];
};

type Props = {
  post: FeedPost;
  meId?: string | null;
  authors?: Record<string, { displayName: string; avatarUrl: string }>;
  onChanged?: () => void;
};

function formatCount(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(sec?: number) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PostCard({ post, meId, authors = {}, onChanged }: Props) {
  const [openComments, setOpenComments] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState<FeedPost[]>(post.similar || []);
  const [showSimilar, setShowSimilar] = useState(false);

  useEffect(() => {
    setSimilar(post.similar || []);
  }, [post.similar]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await act("comment", { body: text, parentId: replyTo });
    setText("");
    setReplyTo(null);
    setOpenComments(true);
  }

  const myVote = meId ? post.voters[meId] : undefined;
  const liked = meId ? post.likedBy.includes(meId) : false;
  const bookmarked = meId ? post.bookmarkedBy.includes(meId) : false;
  const orientation =
    post.media?.orientation ||
    (post.kind === "short"
      ? "portrait"
      : post.media?.width && post.media?.height
        ? post.media.width < post.media.height
          ? "portrait"
          : "landscape"
        : "landscape");
  const hasVideo = !!post.media?.youtubeVideoId;

  async function loadSimilar() {
    setShowSimilar(true);
    if (similar.length) return;
    const res = await fetch(`/api/posts/${post.id}?similar=1`);
    if (!res.ok) return;
    const d = await res.json();
    setSimilar(d.similar || []);
  }

  return (
    <article className="card overflow-hidden" onMouseEnter={() => loadSimilar()}>
      <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        {post.author ? (
          <Link href={`/users/${post.author.id}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.author.avatarUrl}
              alt=""
              className="h-11 w-11 rounded-full bg-sky-100 ring-2 ring-white"
            />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {post.author ? (
              <Link
                href={`/users/${post.author.id}`}
                className="font-semibold text-[#1e3a5f] hover:underline"
              >
                {post.author.displayName}
              </Link>
            ) : null}
            <span className="text-xs text-slate-500">
              {new Date(post.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(post.topics || []).map((t) => (
              <Link
                key={t.id}
                href={`/?sort=topic&topic=${t.slug}`}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ background: t.color }}
              >
                {t.name}
              </Link>
            ))}
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {post.kind}
            </span>
            {post.sourceGroup ? (
              <span className="rounded-full bg-[#e8f4ef] px-2 py-0.5 text-[11px] font-medium text-[#2f6b5a]">
                {post.sourceGroup}
              </span>
            ) : null}
            {orientation ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {orientation}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-4 pb-2 pt-3 sm:px-5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-[#16324f]">
          {post.title}
        </h2>
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
          {post.body}
        </p>
      </div>

      {hasVideo ? (
        <div className="full-bleed mt-1">
          <MediaEmbed
            videoId={post.media!.youtubeVideoId!}
            title={post.media?.title || post.title}
            poster={post.media?.thumbnailUrl}
            orientation={orientation}
            aspect={orientation === "portrait" ? "short" : "wide"}
          />
        </div>
      ) : null}

      {post.imageUrls?.length ? (
        <div className="full-bleed mt-1">
          {post.imageUrls.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className={`w-full object-cover ${
                orientation === "portrait"
                  ? "max-h-[78vh] object-top"
                  : "max-h-[70vh]"
              }`}
            />
          ))}
        </div>
      ) : null}

      {post.media ? (
        <div className="mx-4 mt-3 rounded-2xl bg-sky-50/80 p-3 text-sm text-slate-700 sm:mx-5">
          <p className="font-medium text-[#1e3a5f]">Details</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {post.media.artist ? (
              <>
                <dt className="text-slate-500">Artist</dt>
                <dd className="col-span-1 sm:col-span-2">{post.media.artist}</dd>
              </>
            ) : null}
            {post.media.album ? (
              <>
                <dt className="text-slate-500">Album</dt>
                <dd className="col-span-1 sm:col-span-2">{post.media.album}</dd>
              </>
            ) : null}
            {post.media.genre ? (
              <>
                <dt className="text-slate-500">Genre</dt>
                <dd className="col-span-1 sm:col-span-2">{post.media.genre}</dd>
              </>
            ) : null}
            {post.media.channelTitle ? (
              <>
                <dt className="text-slate-500">Creator</dt>
                <dd className="col-span-1 sm:col-span-2">{post.media.channelTitle}</dd>
              </>
            ) : null}
            {post.media.durationSec ? (
              <>
                <dt className="text-slate-500">Length</dt>
                <dd className="col-span-1 sm:col-span-2">{formatDuration(post.media.durationSec)}</dd>
              </>
            ) : null}
            {post.media.viewCount != null ? (
              <>
                <dt className="text-slate-500">Views</dt>
                <dd className="col-span-1 sm:col-span-2">{formatCount(post.media.viewCount)}</dd>
              </>
            ) : null}
            {post.media.likeCount != null ? (
              <>
                <dt className="text-slate-500">Likes (source)</dt>
                <dd className="col-span-1 sm:col-span-2">{formatCount(post.media.likeCount)}</dd>
              </>
            ) : null}
            {post.media.publishedAt ? (
              <>
                <dt className="text-slate-500">Published</dt>
                <dd className="col-span-1 sm:col-span-2">
                  {new Date(post.media.publishedAt).toLocaleDateString()}
                </dd>
              </>
            ) : null}
            {post.media.tags?.length ? (
              <>
                <dt className="text-slate-500">Tags</dt>
                <dd className="col-span-1 sm:col-span-2">{post.media.tags.join(" · ")}</dd>
              </>
            ) : null}
          </dl>
          {post.media.description ? (
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              {post.media.description}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-slate-400">
            External links hidden · play and discuss on ConnectHub
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-sky-100/80 px-2 py-2 sm:px-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => act("vote", { dir: 1 })}
          className={`action-btn ${myVote === 1 ? "action-btn-active" : ""}`}
        >
          ▲ {post.upvotes}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("vote", { dir: -1 })}
          className={`action-btn ${myVote === -1 ? "action-btn-active" : ""}`}
        >
          ▼ {post.downvotes}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("like")}
          className={`action-btn ${liked ? "action-btn-active" : ""}`}
        >
          ♥ {post.likes}
        </button>
        <button
          type="button"
          onClick={() => setOpenComments((v) => !v)}
          className="action-btn"
        >
          💬 {post.commentCount}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("bookmark")}
          className={`action-btn ${bookmarked ? "action-btn-active" : ""}`}
        >
          {bookmarked ? "★ Saved" : "☆ Save"}
        </button>
        <button type="button" className="action-btn" onClick={loadSimilar}>
          Similar
        </button>
      </div>

      {showSimilar && similar.length ? (
        <div className="border-t border-sky-100 bg-[#f3faf6] px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6b5a]">
            Similar in {post.sourceGroup || post.clusterId || "your interests"}
          </p>
          <ul className="mt-2 space-y-1.5">
            {similar.map((s) => (
              <li key={s.id}>
                <a
                  href={`/?focus=${s.id}`}
                  className="block rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-[#16324f] hover:bg-white"
                >
                  {s.title}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {s.sourcePlatform || s.kind}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {openComments ? (
        <div className="border-t border-sky-100 bg-[#f7fbff] px-4 py-3 sm:px-5">
          <CommentList
            comments={post.comments || []}
            authors={authors}
            onReply={(id) => setReplyTo(id)}
          />
          <form onSubmit={submitComment} className="mt-3 flex flex-col gap-2">
            {replyTo ? (
              <p className="text-xs text-sky-700">
                Replying to nested comment{" "}
                <button type="button" className="underline" onClick={() => setReplyTo(null)}>
                  cancel
                </button>
              </p>
            ) : null}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Leave a nested comment…"
              className="min-h-[72px] w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm outline-none ring-sky-200 focus:ring-2"
            />
            <button type="submit" className="btn-primary self-end" disabled={busy}>
              Comment
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function CommentList({
  comments,
  authors,
  onReply,
  depth = 0,
}: {
  comments: NestedComment[];
  authors: Record<string, { displayName: string; avatarUrl: string }>;
  onReply: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth ? "ml-3 border-l border-sky-100 pl-3" : "space-y-3"}>
      {comments.map((c) => {
        const a = authors[c.authorId];
        return (
          <li key={c.id} className="py-1">
            <div className="flex gap-2">
              {a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatarUrl} alt="" className="mt-0.5 h-7 w-7 rounded-full" />
              ) : (
                <div className="mt-0.5 h-7 w-7 rounded-full bg-sky-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1e3a5f]">
                  {a?.displayName || "Member"}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-slate-700">{c.body}</p>
                <button
                  type="button"
                  className="mt-0.5 text-xs font-medium text-sky-700"
                  onClick={() => onReply(c.id)}
                >
                  Reply
                </button>
              </div>
            </div>
            {c.replies?.length ? (
              <CommentList
                comments={c.replies}
                authors={authors}
                onReply={onReply}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
