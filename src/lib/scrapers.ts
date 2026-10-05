import {
  createPost,
  fingerprintExists,
  getSettings,
  listSourceGroups,
  updateSettings,
  SERVICE_USER_ID,
} from "./db";
import {
  extractImagesFromHtml,
  extractYoutubeIdFromHtml,
  formatIngestBody,
  mergeUniqueUrls,
  stripExternalUrls,
} from "./content";
import { channelMeta, DEFAULT_YT_CHANNELS } from "./channels";
import { NICHE_RSS, NICHE_TOPICS } from "./niches";
import { clusterIdFor, detectOrientation, extractRssItems } from "./similarity";
import type { Post, SourcePlatform } from "./types";
import { prisma } from "./prisma";

export type IngestResult = {
  platform: SourcePlatform;
  imported: number;
  skipped: number;
  error?: string;
  posts: Post[];
};

export { DEFAULT_YT_CHANNELS };

const RSS_SOURCES: Array<{
  platform: SourcePlatform;
  url: string;
  topicId: string;
  group: string;
  kind: Post["kind"];
  tags: string[];
}> = NICHE_RSS.map((s) => ({
  platform: s.platform,
  url: s.url,
  topicId: s.topicId,
  group: s.group,
  kind: s.kind,
  tags: s.tags,
}));

export async function ensureNicheTopics() {
  for (const t of NICHE_TOPICS) {
    await prisma.topic.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        slug: t.slug,
        name: t.name,
        description: t.description,
        color: t.color,
        postCount: 0,
      },
      update: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        color: t.color,
      },
    });
  }
}
async function fetchText(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "ConnectHubCurator/1.0 (+https://connecthub.local)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function publishPost(
  partial: Parameters<typeof createPost>[0] & { upvotes?: number; likes?: number }
): Promise<Post> {
  return createPost({
    ...partial,
    upvotes: partial.upvotes ?? Math.floor(Math.random() * 40),
    likes: partial.likes ?? Math.floor(Math.random() * 25),
  });
}

function discussionLine(tags: string[]) {
  return `Discussion prompt: Which angle matters most for ConnectHub members interested in ${tags.slice(0, 2).join(" & ")}? Share takes in comments — outbound links stay removed.`;
}

function enrichWeakLocal(title: string, platform: string, tags: string[], prompt: string) {
  return `${title}. Curated from ${platform} for in-app reading. Topics: ${tags.join(", ")}. ${prompt}`;
}

async function enrichFromArticlePage(url?: string): Promise<{
  imageUrls: string[];
  youtubeVideoId?: string;
}> {
  if (!url || !/^https?:\/\//i.test(url)) return { imageUrls: [] };
  try {
    const html = await fetchText(url, 7000);
    return {
      imageUrls: extractImagesFromHtml(html).slice(0, 4),
      youtubeVideoId: extractYoutubeIdFromHtml(html),
    };
  } catch {
    return { imageUrls: [] };
  }
}

/**
 * Fetch a YouTube channel's recent uploads via public Atom RSS (no API key).
 * Publishes as public service-role posts; skips duplicates by video id.
 */
export async function syncYoutubeChannelRss(
  channelId: string,
  limit = 8
): Promise<IngestResult> {
  const platform: SourcePlatform = "youtube";
  try {
    const xml = await fetchText(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
    );
    const items = extractRssItems(xml).slice(0, limit);
    const posts: Post[] = [];
    let skipped = 0;
    for (const item of items) {
      const videoId = item.videoId || item.guid.replace(/^yt:/, "");
      const fp = `yt:${videoId}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const meta = channelMeta(channelId);
      const isMusic = meta.niche === "music" || meta.topicId === "t1";
      const isShortGuess =
        /#shorts/i.test(item.title) ||
        /#shorts/i.test(item.description) ||
        (!isMusic && item.description.length < 180);
      const orientation = isShortGuess ? "portrait" : "landscape";
      const topicIds = isShortGuess
        ? ["t2", meta.topicId]
        : isMusic
          ? ["t1"]
          : [meta.topicId, "t4"];
      const uniqueTopics = Array.from(new Set(topicIds));
      const tags = [
        "youtube",
        meta.niche,
        isShortGuess ? "shorts" : isMusic ? "music" : "video",
        meta.label.toLowerCase().replace(/\s+/g, "-"),
        ...item.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4),
      ];
      const kind: Post["kind"] = isShortGuess ? "short" : isMusic ? "music" : "video";
      const group = isMusic
        ? "Music Artists"
        : isShortGuess
          ? "Shorts"
          : `YouTube · ${meta.niche}`;
      const formatted = formatIngestBody(
        item.description ||
          `${item.title} — ingested from ${meta.label} RSS for in-app viewing and discussion.`,
        `Target discussion: What stood out? Drop nested comments on pacing, topic angle, or how this connects to other ${meta.niche} ${isShortGuess ? "shorts" : "uploads"} in this cluster.`,
        { title: item.title, tags, platform: meta.label }
      );
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind,
        title: item.title.slice(0, 120),
        body: formatted.body,
        topicIds: uniqueTopics,
        imageUrls: mergeUniqueUrls(
          item.imageUrls,
          item.thumbnail ? [item.thumbnail] : undefined,
          formatted.imageUrls
        ),
        media: {
          title: item.title,
          description: formatted.body.slice(0, 900),
          channelTitle: meta.label,
          artist: isMusic ? meta.label : undefined,
          genre: isMusic ? "Music" : undefined,
          youtubeVideoId: formatted.youtubeVideoId || videoId,
          thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: item.publishedAt,
          tags,
          width: orientation === "portrait" ? 1080 : 1920,
          height: orientation === "portrait" ? 1920 : 1080,
          orientation,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: isMusic ? "music" : platform,
        sourceGroup: group,
        clusterId: clusterIdFor(isMusic ? "music" : platform, tags, uniqueTopics),
      });
      posts.push(post);
    }
    return { platform, imported: posts.length, skipped, posts };
  } catch (e) {
    return {
      platform,
      imported: 0,
      skipped: 0,
      posts: [],
      error: e instanceof Error ? e.message : "YouTube RSS failed",
    };
  }
}

export async function syncAllYoutubeChannels(limitPerChannel = 5): Promise<IngestResult[]> {
  const settings = await getSettings();
  const ids = settings.youtubeChannelIds.length
    ? settings.youtubeChannelIds
    : DEFAULT_YT_CHANNELS.map((c) => c.id);
  const out: IngestResult[] = [];
  for (const id of ids) {
    out.push(await syncYoutubeChannelRss(id, limitPerChannel));
  }
  return out;
}

export async function syncRssSource(
  platform: SourcePlatform,
  url: string,
  topicId: string,
  group: string,
  kind: Post["kind"],
  tags: string[],
  limit = 6
): Promise<IngestResult> {
  try {
    const xml = await fetchText(url);
    const items = extractRssItems(xml).slice(0, limit);
    const posts: Post[] = [];
    let skipped = 0;
    for (const item of items) {
      const fp = `${platform}:${item.guid}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const formatted = formatIngestBody(
        item.description || item.title,
        discussionLine(tags),
        { title: item.title, tags, platform }
      );
      let imageUrls = mergeUniqueUrls(
        item.imageUrls,
        item.thumbnail ? [item.thumbnail] : undefined,
        formatted.imageUrls
      );
      let yt = formatted.youtubeVideoId || item.videoId;
      if (!imageUrls.length && !yt) {
        const extra = await enrichFromArticlePage(item.link);
        imageUrls = mergeUniqueUrls(imageUrls, extra.imageUrls);
        yt = yt || extra.youtubeVideoId;
      }
      const body =
        formatted.body.length < 80
          ? enrichWeakLocal(item.title, platform, tags, discussionLine(tags))
          : formatted.body;
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind: yt ? "video" : kind,
        title: item.title.slice(0, 120),
        body,
        topicIds: [topicId],
        imageUrls,
        media: {
          title: item.title,
          description: body.slice(0, 900),
          channelTitle: platform,
          thumbnailUrl: item.thumbnail || imageUrls[0],
          publishedAt: item.publishedAt,
          tags: [...tags, platform],
          orientation: "landscape",
          width: 1600,
          height: 900,
          youtubeVideoId: yt,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: group,
        clusterId: clusterIdFor(platform, tags, [topicId]),
      });
      posts.push(post);
    }
    return { platform, imported: posts.length, skipped, posts };
  } catch (e) {
    return {
      platform,
      imported: 0,
      skipped: 0,
      posts: [],
      error: e instanceof Error ? e.message : "RSS failed",
    };
  }
}

/** Hacker News official Firebase API — no key */
export async function syncHackerNews(limit = 8): Promise<IngestResult> {
  const platform: SourcePlatform = "hackernews";
  try {
    const ids = (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json").then((r) =>
      r.json()
    )) as number[];
    const posts: Post[] = [];
    let skipped = 0;
    for (const id of ids.slice(0, limit)) {
      const fp = `hn:${id}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const item = (await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) =>
        r.json()
      )) as {
        title?: string;
        text?: string;
        score?: number;
        time?: number;
        by?: string;
        descendants?: number;
      };
      if (!item?.title) continue;
      const formatted = formatIngestBody(
        item.text || `${item.title} — trending on Hacker News (${item.score || 0} points).`,
        "HN discussion angle: Would you build on this? Comment with technical takes — no outbound hops."
      );
      const tags = ["hackernews", "startups", "developers"];
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind: formatted.youtubeVideoId ? "video" : "news",
        title: item.title.slice(0, 120),
        body: formatted.body,
        topicIds: ["t6"],
        imageUrls: formatted.imageUrls,
        media: {
          title: item.title,
          description: formatted.body.slice(0, 900),
          channelTitle: item.by || "HN",
          publishedAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
          viewCount: item.score,
          likeCount: item.descendants,
          tags,
          orientation: "landscape",
          youtubeVideoId: formatted.youtubeVideoId,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Social News Aggregators",
        clusterId: clusterIdFor(platform, tags, ["t6"]),
        upvotes: item.score || 10,
      });
      posts.push(post);
    }
    return { platform, imported: posts.length, skipped, posts };
  } catch (e) {
    return {
      platform,
      imported: 0,
      skipped: 0,
      posts: [],
      error: e instanceof Error ? e.message : "HN failed",
    };
  }
}

/** Reddit public JSON (.json) for hot posts above a score threshold */
export async function syncReddit(
  subreddit = "technology",
  minScore = 200,
  limit = 6,
  topicId = "t6"
): Promise<IngestResult> {
  const platform: SourcePlatform = "reddit";
  try {
    const json = (await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=25`, {
      headers: { "User-Agent": "ConnectHubCurator/1.0" },
    }).then((r) => r.json())) as {
      data?: {
        children?: Array<{
          data: {
            id: string;
            title: string;
            selftext?: string;
            selftext_html?: string;
            score: number;
            thumbnail?: string;
            preview?: { images?: Array<{ source?: { url?: string } }> };
            created_utc: number;
            num_comments: number;
            link_flair_text?: string;
            url_overridden_by_dest?: string;
            is_video?: boolean;
            media?: { reddit_video?: { fallback_url?: string } };
          };
        }>;
      };
    };
    const posts: Post[] = [];
    let skipped = 0;
    const children = (json.data?.children || [])
      .map((c) => c.data)
      .filter((d) => d.score >= minScore)
      .slice(0, limit);
    for (const d of children) {
      const fp = `reddit:${d.id}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["reddit", subreddit, d.link_flair_text || "discussion"].filter(Boolean);
      const raw = `${d.selftext_html || d.selftext || d.title}\n\nr/${subreddit} · ${d.score} upvotes · ${d.num_comments} comments`;
      const formatted = formatIngestBody(
        raw,
        "Comment prompt: Agree with the community take, or push back? Keep the thread here.",
        { title: d.title, tags, platform: `r/${subreddit}` }
      );
      const preview = d.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&");
      const thumb = d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : undefined;
      const imageUrls = mergeUniqueUrls(formatted.imageUrls, preview ? [preview] : undefined, thumb ? [thumb] : undefined);
      const yt =
        formatted.youtubeVideoId ||
        (d.url_overridden_by_dest ? formatIngestBody(d.url_overridden_by_dest).youtubeVideoId : undefined);
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind: yt ? "video" : imageUrls.length ? "image" : "news",
        title: d.title.slice(0, 120),
        body: formatted.body,
        topicIds: [topicId],
        imageUrls,
        media: {
          title: d.title,
          description: formatted.body.slice(0, 900),
          channelTitle: `r/${subreddit}`,
          thumbnailUrl: thumb || imageUrls[0],
          publishedAt: new Date(d.created_utc * 1000).toISOString(),
          viewCount: d.score,
          likeCount: d.num_comments,
          tags,
          orientation: "landscape",
          youtubeVideoId: yt,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Social News Aggregators",
        clusterId: clusterIdFor(platform, tags, [topicId]),
        upvotes: Math.min(d.score, 500),
      });
      posts.push(post);
    }
    return { platform, imported: posts.length, skipped, posts };
  } catch (e) {
    return {
      platform,
      imported: 0,
      skipped: 0,
      posts: [],
      error: e instanceof Error ? e.message : "Reddit failed",
    };
  }
}

/** GitHub Trending via unofficial daily JSON mirror; falls back to curated seed */
export async function syncGithubTrending(limit = 6): Promise<IngestResult> {
  const platform: SourcePlatform = "github";
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/trending-repos/trending-repos/main/data/daily.json",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      name?: string;
      full_name?: string;
      description?: string;
      language?: string;
      stars?: number;
      url?: string;
    }>;
    const posts: Post[] = [];
    let skipped = 0;
    for (const repo of (data || []).slice(0, limit)) {
      const name = repo.full_name || repo.name;
      if (!name) continue;
      const fp = `github:${name}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["github", "opensource", (repo.language || "code").toLowerCase()];
      const formatted = formatIngestBody(
        `${repo.description || name} — trending open-source (${repo.stars || 0}★). Language: ${repo.language || "n/a"}.`,
        "Dev prompt: Would you star this? Comment on use-cases — repo links stay in-app only as titles."
      );
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind: "article",
        title: `Trending: ${name}`.slice(0, 120),
        body: formatted.body,
        topicIds: ["t6"],
        imageUrls: formatted.imageUrls,
        media: {
          title: name,
          description: formatted.body.slice(0, 900),
          channelTitle: "GitHub Trending",
          tags,
          likeCount: repo.stars,
          orientation: "landscape",
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Developer Hubs",
        clusterId: clusterIdFor(platform, tags, ["t6"]),
      });
      posts.push(post);
    }
    if (!posts.length && skipped === 0) throw new Error("Empty trending payload");
    return { platform, imported: posts.length, skipped, posts };
  } catch {
    const fallback = [
      {
        name: "vercel/next.js",
        description: "The React Framework for the Web — still dominating daily trends.",
        language: "TypeScript",
        stars: 130000,
      },
      {
        name: "facebook/react",
        description: "Library for web and native user interfaces.",
        language: "JavaScript",
        stars: 230000,
      },
      {
        name: "openai/whisper",
        description: "Robust speech recognition via large-scale weak supervision.",
        language: "Python",
        stars: 78000,
      },
    ];
    const posts: Post[] = [];
    let skipped = 0;
    for (const repo of fallback.slice(0, limit)) {
      const fp = `github:${repo.name}`;
      if (await fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["github", "opensource", repo.language.toLowerCase()];
      const post = await publishPost({
        authorId: SERVICE_USER_ID,
        kind: "article",
        title: `Trending: ${repo.name}`,
        body: stripExternalUrls(
          `${repo.description}\n\nDev prompt: Share how you'd use this in a ConnectHub feature.`
        ),
        topicIds: ["t6"],
        media: {
          title: repo.name,
          description: repo.description,
          channelTitle: "GitHub Trending",
          tags,
          likeCount: repo.stars,
          orientation: "landscape",
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Developer Hubs",
        clusterId: clusterIdFor(platform, tags, ["t6"]),
      });
      posts.push(post);
    }
    return { platform, imported: posts.length, skipped, posts };
  }
}

export async function runDailyIngest(opts?: {
  youtubeLimit?: number;
  rssLimit?: number;
}): Promise<{
  results: IngestResult[];
  totalImported: number;
  ranAt: string;
  groups: string[];
}> {
  await ensureNicheTopics();
  const enabled = new Set((await getSettings()).enabledSources);
  const results: IngestResult[] = [];

  if (enabled.has("youtube") || enabled.has("music")) {
    results.push(...(await syncAllYoutubeChannels(opts?.youtubeLimit ?? 3)));
  }

  // Always refresh known-artist music catalog when music is enabled
  if (enabled.has("music")) {
    const { syncMusicFeed } = await import("./youtube");
    const music = await syncMusicFeed();
    results.push({
      platform: "music",
      imported: music.imported,
      skipped: 0,
      posts: music.posts,
    });
  }

  for (const src of RSS_SOURCES) {
    // Allow niche platforms even if not in enabledSources list yet
    if (!enabled.has(src.platform) && !enabled.has("youtube")) {
      // still ingest niche feeds when core curation is on
      const coreOn =
        enabled.has("techcrunch") ||
        enabled.has("devto") ||
        enabled.has("wired") ||
        enabled.has("theverge");
      if (!coreOn) continue;
    }
    results.push(
      await syncRssSource(
        src.platform,
        src.url,
        src.topicId,
        src.group,
        src.kind,
        src.tags,
        opts?.rssLimit ?? 4
      )
    );
  }
  if (enabled.has("hackernews")) results.push(await syncHackerNews(opts?.rssLimit ?? 6));
  if (enabled.has("reddit")) {
    const subs: Array<{ sub: string; topicId: string; min: number }> = [
      { sub: "technology", topicId: "t6", min: 150 },
      { sub: "science", topicId: "t7", min: 100 },
      { sub: "sports", topicId: "t8", min: 120 },
      { sub: "movies", topicId: "t16", min: 100 },
      { sub: "food", topicId: "t12", min: 80 },
      { sub: "travel", topicId: "t13", min: 80 },
      { sub: "personalfinance", topicId: "t15", min: 100 },
      { sub: "design", topicId: "t18", min: 80 },
      { sub: "webdev", topicId: "t17", min: 80 },
      { sub: "artificial", topicId: "t6", min: 100 },
    ];
    for (const s of subs) {
      results.push(await syncReddit(s.sub, s.min, 3, s.topicId));
    }
  }
  if (enabled.has("github")) results.push(await syncGithubTrending(5));

  const ranAt = new Date().toISOString();
  await updateSettings({ lastIngestAt: ranAt });
  const groups = await listSourceGroups();

  return {
    results,
    totalImported: results.reduce((n, r) => n + r.imported, 0),
    ranAt,
    groups,
  };
}

export { detectOrientation, RSS_SOURCES };
