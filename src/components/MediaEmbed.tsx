"use client";

import { useMemo, useState } from "react";

type Props = {
  videoId: string;
  title?: string;
  poster?: string;
  /** vertical short vs landscape music/video */
  aspect?: "short" | "wide";
};

/**
 * In-app player: youtube-nocookie + modest branding params + CSS masks
 * so platform marks / title overlays don't pull users off ConnectHub.
 */
export function MediaEmbed({ videoId, title, poster, aspect = "wide" }: Props) {
  const [playing, setPlaying] = useState(false);

  const src = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      modestbranding: "1",
      rel: "0",
      controls: "1",
      fs: "0",
      iv_load_policy: "3",
      disablekb: "0",
      playsinline: "1",
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  const frameClass =
    aspect === "short"
      ? "aspect-[9/16] max-h-[78vh] w-full sm:max-h-[70vh]"
      : "aspect-video w-full";

  return (
    <div className={`media-shell relative w-full overflow-hidden bg-[#0f1720] ${frameClass}`}>
      {!playing ? (
        <button
          type="button"
          className="group absolute inset-0 z-10 flex w-full items-center justify-center"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title || "media"}`}
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-900/80 to-slate-900" />
          )}
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#1e3a5f] shadow-lg transition group-hover:scale-105">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="absolute bottom-3 left-3 right-3 z-10 truncate text-left text-sm font-medium text-white drop-shadow">
            {title}
          </span>
        </button>
      ) : (
        <>
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={src}
            title={title || "ConnectHub media"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {/* Masks common YouTube chrome / logo corners without blocking center controls */}
          <div className="yt-mask yt-mask-br pointer-events-auto" aria-hidden />
          <div className="yt-mask yt-mask-tr pointer-events-auto" aria-hidden />
          <div className="yt-mask yt-mask-tl pointer-events-none" aria-hidden />
        </>
      )}
    </div>
  );
}
