"use client";

import { useState } from "react";

type Props = {
  title: string;
  postId: string;
  text?: string;
};

/** Share ConnectHub post URLs only — keeps engagement on-platform destinations we control */
export function ShareButton({ title, postId, text }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function url() {
    if (typeof window === "undefined") return `/post/${postId}`;
    return `${window.location.origin}/?focus=${postId}`;
  }

  async function nativeShare() {
    const shareUrl = url();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url: shareUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    setOpen((v) => !v);
  }

  async function copy() {
    await navigator.clipboard.writeText(url());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const encoded = encodeURIComponent(url());
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="relative inline-block">
      <button type="button" className="action-btn" onClick={nativeShare}>
        Share
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-52 rounded-xl border border-sky-100 bg-white p-2 shadow-lg">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Share ConnectHub link
          </p>
          <a
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-sky-50"
            href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`}
            target="_blank"
            rel="noreferrer"
          >
            X / Twitter
          </a>
          <a
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-sky-50"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <a
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-sky-50"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <a
            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-sky-50"
            href={`https://wa.me/?text=${encodedTitle}%20${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <button type="button" className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sky-50" onClick={copy}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
