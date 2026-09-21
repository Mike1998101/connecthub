/**
 * Clean scraped HTML for in-app feed cards: extract media, strip tags to plain text.
 */

const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{6,})/i;

const IMG_EXT = /\.(?:jpe?g|png|gif|webp|avif)(?:\?|$)/i;

const TAG_RE = /<\/?[a-zA-Z][^>]*>/g;

function decodeEntities(html: string): string {
  return html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function absUrl(src: string): string | null {
  const u = src.trim().replace(/&amp;/g, "&");
  if (!u || u.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return null;
}

function shouldKeepImage(abs: string): boolean {
  if (/(?:pixel|tracker|1x1|spacer|sprite|favicon|icon[-_/])/i.test(abs)) return false;
  if (/\.svg(?:\?|$)/i.test(abs)) return false;
  return (
    IMG_EXT.test(abs) ||
    /\/image/i.test(abs) ||
    abs.includes("ytimg") ||
    abs.includes("unsplash") ||
    abs.includes("imgur") ||
    abs.includes("cloudinary") ||
    abs.includes("wp-content") ||
    abs.includes("cdn") ||
    abs.includes("media") ||
    abs.includes("static")
  );
}

export function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const push = (raw?: string) => {
    if (!raw) return;
    const first = raw.split(/\s+/)[0]?.split(",")[0];
    const abs = first ? absUrl(first) : null;
    if (!abs || urls.includes(abs)) return;
    if (shouldKeepImage(abs) || /^https?:\/\//i.test(abs)) urls.push(abs);
  };

  const decoded = decodeEntities(html);
  const imgRe =
    /<img\b[^>]*(?:src|data-src|data-original|data-lazy-src|data-orig-file)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(decoded))) push(m[1]);

  const srcsetRe = /(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(decoded))) {
    const candidate = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    push(candidate);
  }

  const ogRe = /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRe.exec(decoded))) push(m[1]);
  const contentOg = /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/gi;
  while ((m = contentOg.exec(decoded))) push(m[1]);

  const twitter = /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = twitter.exec(decoded))) push(m[1]);

  const media =
    /<(?:media:content|media:thumbnail|enclosure)[^>]+(?:url|href)=["']([^"']+)["'][^>]*>/gi;
  while ((m = media.exec(decoded))) push(m[1]);

  const bg = /url\(["']?(https?:\/\/[^"')]+)["']?\)/gi;
  while ((m = bg.exec(decoded))) push(m[1]);

  return urls.filter(shouldKeepImage).slice(0, 6);
}

export function extractYoutubeIdFromHtml(html: string): string | undefined {
  const decoded = decodeEntities(html);
  const iframe = decoded.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (iframe?.[1]) return iframe[1];
  const shorts = decoded.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (shorts?.[1]) return shorts[1];
  const link = decoded.match(YT_ID_RE);
  return link?.[1];
}

export function htmlToPlainText(html: string): string {
  let text = String(html ?? "");
  for (let i = 0; i < 4; i++) text = decodeEntities(text);
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr|blockquote|article|section|figcaption)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  for (let i = 0; i < 8 && TAG_RE.test(text); i++) {
    TAG_RE.lastIndex = 0;
    text = text.replace(TAG_RE, " ");
  }
  TAG_RE.lastIndex = 0;
  text = text.replace(/[<>]/g, " ");
  text = decodeEntities(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text;
}

export function looksLikeHtml(raw: string): boolean {
  if (!raw) return false;
  return /<\/?[a-z][\s\S]*?>/i.test(raw) || /&lt;\/?[a-z]/i.test(raw);
}

export function sanitizeScrapedContent(raw: string): {
  body: string;
  imageUrls: string[];
  youtubeVideoId?: string;
} {
  const decoded = decodeEntities(String(raw ?? ""));
  const imageUrls = extractImagesFromHtml(decoded);
  const youtubeVideoId = extractYoutubeIdFromHtml(decoded);
  const body = htmlToPlainText(raw).replace(TAG_RE, "").trim();
  return { body, imageUrls, youtubeVideoId };
}

export function stripExternalUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[link removed — stay on ConnectHub]")
    .replace(/www\.\S+/gi, "[link removed — stay on ConnectHub]")
    .replace(/youtu\.be\/\S+/gi, "")
    .replace(/youtube\.com\/\S+/gi, "");
}

/** Full pipeline for RSS/HTML article bodies shown in the feed */
export function formatIngestBody(
  raw: string,
  discussionPrompt?: string
): {
  body: string;
  imageUrls: string[];
  youtubeVideoId?: string;
} {
  const cleaned = sanitizeScrapedContent(raw);
  let plain = stripExternalUrls(cleaned.body).slice(0, 1800).trim();
  if (discussionPrompt && !/discussion prompt:/i.test(plain)) {
    plain = `${plain}\n\n${discussionPrompt}`.trim();
  }
  return {
    body: plain,
    imageUrls: cleaned.imageUrls,
    youtubeVideoId: cleaned.youtubeVideoId,
  };
}

export function mergeUniqueUrls(...lists: Array<string[] | undefined>): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const u of list || []) {
      if (u && /^https?:\/\//i.test(u) && !out.includes(u) && shouldKeepImage(u)) out.push(u);
    }
  }
  return out.slice(0, 6);
}
