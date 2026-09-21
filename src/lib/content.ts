/**
 * Clean scraped HTML for in-app feed cards: extract media, strip tags to plain text.
 */

const YT_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;

export function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const src = m[1];
    if (src && /^https?:\/\//i.test(src) && !urls.includes(src)) urls.push(src);
  }
  const ogRe = /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
  while ((m = ogRe.exec(html))) {
    if (m[1] && !urls.includes(m[1])) urls.push(m[1]);
  }
  const contentOg = /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi;
  while ((m = contentOg.exec(html))) {
    if (m[1] && !urls.includes(m[1])) urls.push(m[1]);
  }
  return urls.slice(0, 6);
}

export function extractYoutubeIdFromHtml(html: string): string | undefined {
  const iframe = html.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (iframe?.[1]) return iframe[1];
  const link = html.match(YT_ID_RE);
  return link?.[1];
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function sanitizeScrapedContent(raw: string): {
  body: string;
  imageUrls: string[];
  youtubeVideoId?: string;
} {
  const imageUrls = extractImagesFromHtml(raw);
  const youtubeVideoId = extractYoutubeIdFromHtml(raw);
  let body = htmlToPlainText(raw);
  // Drop leftover bare tags if any
  body = body.replace(/<\/?[a-z][^>]*>/gi, "").trim();
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
export function formatIngestBody(raw: string, discussionPrompt?: string): {
  body: string;
  imageUrls: string[];
  youtubeVideoId?: string;
} {
  const cleaned = sanitizeScrapedContent(raw);
  const plain = stripExternalUrls(cleaned.body).slice(0, 1800);
  const body = discussionPrompt
    ? `${plain}\n\n${discussionPrompt}`
    : plain;
  return {
    body,
    imageUrls: cleaned.imageUrls,
    youtubeVideoId: cleaned.youtubeVideoId,
  };
}
