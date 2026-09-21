import type { MediaOrientation, Post, SourcePlatform } from "./types";
import { extractImagesFromHtml, extractYoutubeIdFromHtml, htmlToPlainText } from "./content";

export function detectOrientation(width?: number, height?: number): MediaOrientation {
  if (!width || !height) return "landscape";
  const ratio = width / height;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.15) return "landscape";
  return "square";
}

export function clusterIdFor(platform: SourcePlatform, tags: string[] = [], topicIds: string[] = []) {
  const primary = tags[0] || topicIds[0] || platform;
  return `${platform}:${primary}`.toLowerCase().replace(/\s+/g, "-");
}

/** Rank posts similar to a seed by shared cluster, topics, tags, and platform */
export function suggestSimilarPosts(seed: Post, pool: Post[], limit = 6): Post[] {
  const seedTags = new Set((seed.media?.tags || []).map((t) => t.toLowerCase()));
  const seedTopics = new Set(seed.topicIds);

  return pool
    .filter((p) => p.id !== seed.id)
    .map((p) => {
      let score = 0;
      if (seed.clusterId && p.clusterId === seed.clusterId) score += 8;
      if (seed.sourcePlatform && p.sourcePlatform === seed.sourcePlatform) score += 3;
      if (seed.sourceGroup && p.sourceGroup === seed.sourceGroup) score += 4;
      for (const t of p.topicIds) if (seedTopics.has(t)) score += 2;
      for (const tag of p.media?.tags || []) {
        if (seedTags.has(tag.toLowerCase())) score += 2;
      }
      const titleOverlap = overlapTokens(seed.title, p.title);
      score += titleOverlap;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || +new Date(b.p.createdAt) - +new Date(a.p.createdAt))
    .slice(0, limit)
    .map((x) => x.p);
}

function overlapTokens(a: string, b: string) {
  const ta = new Set(
    a
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
  );
  let n = 0;
  for (const w of b.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 3 && ta.has(w)) n += 1;
  }
  return Math.min(n, 5);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractRssItems(xml: string): Array<{
  title: string;
  description: string;
  guid: string;
  publishedAt: string;
  link?: string;
  thumbnail?: string;
  videoId?: string;
  imageUrls: string[];
}> {
  const items: Array<{
    title: string;
    description: string;
    guid: string;
    publishedAt: string;
    link?: string;
    thumbnail?: string;
    videoId?: string;
    imageUrls: string[];
  }> = [];

  // Atom entries (YouTube)
  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const entry of atomEntries) {
    const title = pick(entry, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const id = pick(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/i) || pick(entry, /<id>([\s\S]*?)<\/id>/i);
    const published =
      pick(entry, /<published>([\s\S]*?)<\/published>/i) ||
      pick(entry, /<updated>([\s\S]*?)<\/updated>/i) ||
      new Date().toISOString();
    const mediaDesc =
      pick(entry, /<media:description[^>]*>([\s\S]*?)<\/media:description>/i) ||
      pick(entry, /<content[^>]*>([\s\S]*?)<\/content>/i) ||
      "";
    const thumb =
      pickAttr(entry, /<media:thumbnail[^>]*url="([^"]+)"/i) ||
      (id && !id.includes(":") ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined);
    const videoId = pick(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/i);
    if (!title || !id) continue;
    const rawDesc = decodeXml(mediaDesc);
    const yt = videoId || extractYoutubeIdFromHtml(entry + rawDesc);
    const imageUrls = extractImagesFromHtml(entry + rawDesc);
    items.push({
      title: htmlToPlainText(decodeXml(title)).slice(0, 180),
      description: rawDesc,
      guid: yt ? `yt:${yt}` : id,
      publishedAt: published,
      thumbnail: thumb,
      videoId: yt || undefined,
      imageUrls,
    });
  }

  if (items.length) return items;

  // RSS 2.0 items
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const item of rssItems) {
    const title = pick(item, /<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const encoded = pick(
      item,
      /<content:encoded[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i
    );
    const desc =
      encoded ||
      pick(item, /<description[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
      "";
    const link =
      pickAttr(item, /<link[^>]+href="([^"]+)"/i) ||
      pick(item, /<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i) ||
      undefined;
    const guid =
      pick(item, /<guid[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/guid>/i) ||
      link ||
      title;
    const published =
      pick(item, /<pubDate>([\s\S]*?)<\/pubDate>/i) ||
      pick(item, /<dc:date>([\s\S]*?)<\/dc:date>/i) ||
      new Date().toISOString();
    const thumb =
      pickAttr(item, /<media:thumbnail[^>]*url="([^"]+)"/i) ||
      pickAttr(item, /<media:content[^>]*url="([^"]+\.(?:jpe?g|png|webp|gif)[^"]*)"/i) ||
      pickAttr(item, /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp|gif)[^"]*)"/i) ||
      undefined;
    if (!title || !guid) continue;
    let publishedIso = published;
    const parsed = Date.parse(published);
    if (!Number.isNaN(parsed)) publishedIso = new Date(parsed).toISOString();
    const rawDesc = decodeXml(desc);
    const imageUrls = extractImagesFromHtml(item + rawDesc);
    if (thumb && !imageUrls.includes(thumb)) imageUrls.unshift(thumb);
    const videoId = extractYoutubeIdFromHtml(item + rawDesc + (link || ""));
    items.push({
      title: htmlToPlainText(decodeXml(title)).slice(0, 180),
      description: rawDesc,
      guid: guid.trim(),
      publishedAt: publishedIso,
      link: link ? decodeXml(link).trim() : undefined,
      thumbnail: thumb || imageUrls[0],
      videoId,
      imageUrls,
    });
  }

  return items;
}

function pick(block: string, re: RegExp): string {
  const m = block.match(re);
  if (!m) return "";
  return (m[1] || m[2] || "").trim();
}

function pickAttr(block: string, re: RegExp): string | undefined {
  const m = block.match(re);
  return m?.[1];
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
