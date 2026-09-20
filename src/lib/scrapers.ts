import {
  getState,
  mutate,
  stripExternalUrls,
  uid,
  SERVICE_USER_ID,
} from "./store";
import { DEFAULT_YT_CHANNELS } from "./channels";
import { clusterIdFor, detectOrientation, extractRssItems } from "./similarity";
import type { Post, SourcePlatform } from "./types";

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
}> = [
  {
    platform: "techcrunch",
    url: "https://techcrunch.com/feed/",
    topicId: "t6",
    group: "Tech & Business Media",
    kind: "article",
    tags: ["tech", "startups", "funding"],
  },
  {
    platform: "theverge",
    url: "https://www.theverge.com/rss/index.xml",
    topicId: "t6",
    group: "Tech & Business Media",
    kind: "news",
    tags: ["tech", "gadgets", "culture"],
  },
  {
    platform: "wired",
    url: "https://www.wired.com/feed/rss",
    topicId: "t6",
    group: "Tech & Business Media",
    kind: "article",
    tags: ["tech", "features", "science"],
  },
  {
    platform: "gizmodo",
    url: "https://gizmodo.com/rss",
    topicId: "t6",
    group: "Tech & Business Media",
    kind: "news",
    tags: ["gadgets", "reviews"],
  },
  {
    platform: "devto",
    url: "https://dev.to/feed",
    topicId: "t6",
    group: "Developer Hubs",
    kind: "article",
    tags: ["webdev", "tutorials", "engineering"],
  },
];

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

function fingerprintExists(fp: string) {
  return getState().posts.some((p) => p.fingerprint === fp);
}

function publishPost(partial: Omit<Post, "id" | "createdAt" | "updatedAt" | "upvotes" | "downvotes" | "likes" | "commentCount" | "bookmarkedBy" | "likedBy" | "voters"> & Partial<Post>) {
  const post: Post = {
    id: uid("p"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: Math.floor(Math.random() * 40),
    downvotes: 0,
    likes: Math.floor(Math.random() * 25),
    commentCount: 0,
    bookmarkedBy: [],
    likedBy: [],
    voters: {},
    ...partial,
  };
  mutate((s) => {
    if (post.fingerprint && s.posts.some((p) => p.fingerprint === post.fingerprint)) return;
    s.posts.unshift(post);
    const topic = s.topics.find((t) => post.topicIds.includes(t.id));
    if (topic) topic.postCount += 1;
  });
  return post;
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
      if (fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const isShortGuess =
        /#shorts/i.test(item.title) ||
        /#shorts/i.test(item.description) ||
        item.description.length < 180;
      const orientation = isShortGuess ? "portrait" : "landscape";
      const topicIds = isShortGuess ? ["t2"] : ["t2", "t4"];
      const tags = [
        "youtube",
        isShortGuess ? "shorts" : "video",
        channelId.slice(0, 8),
        ...item.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4),
      ];
      const description =
        item.description ||
        `${item.title} — ingested from channel RSS for in-app viewing and discussion.`;
      const body = stripExternalUrls(
        `${description}\n\nTarget discussion: What stood out? Drop nested comments on pacing, topic angle, or how this connects to other ${isShortGuess ? "shorts" : "uploads"} in this cluster.`
      );
      const post = publishPost({
        authorId: SERVICE_USER_ID,
        kind: isShortGuess ? "short" : "video",
        title: item.title.slice(0, 120),
        body,
        topicIds,
        media: {
          title: item.title,
          description: stripExternalUrls(description).slice(0, 900),
          channelTitle: channelId,
          youtubeVideoId: videoId,
          thumbnailUrl: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: item.publishedAt,
          tags,
          width: orientation === "portrait" ? 1080 : 1920,
          height: orientation === "portrait" ? 1920 : 1080,
          orientation,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "YouTube Channels",
        clusterId: clusterIdFor(platform, tags, topicIds),
      });
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
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
  const ids = getState().settings.youtubeChannelIds.length
    ? getState().settings.youtubeChannelIds
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
      if (fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const description = item.description || item.title;
      const body = stripExternalUrls(
        `${description}\n\nDiscussion prompt: Which angle matters most for ConnectHub members interested in ${tags.slice(0, 2).join(" & ")}? Share takes in comments — outbound links stay removed.`
      );
      const post = publishPost({
        authorId: SERVICE_USER_ID,
        kind,
        title: item.title.slice(0, 120),
        body,
        topicIds: [topicId],
        imageUrls: item.thumbnail ? [item.thumbnail] : undefined,
        media: {
          title: item.title,
          description: stripExternalUrls(description).slice(0, 900),
          channelTitle: platform,
          thumbnailUrl: item.thumbnail,
          publishedAt: item.publishedAt,
          tags: [...tags, platform],
          orientation: "landscape",
          width: 1600,
          height: 900,
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: group,
        clusterId: clusterIdFor(platform, tags, [topicId]),
      });
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
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
      if (fingerprintExists(fp)) {
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
      const description = stripExternalUrls(
        item.text
          ? item.text.replace(/<[^>]+>/g, " ")
          : `${item.title} — trending on Hacker News (${item.score || 0} points).`
      );
      const tags = ["hackernews", "startups", "developers"];
      const body = stripExternalUrls(
        `${description}\n\nHN discussion angle: Would you build on this? Comment with technical takes — no outbound hops.`
      );
      const post = publishPost({
        authorId: SERVICE_USER_ID,
        kind: "news",
        title: item.title.slice(0, 120),
        body,
        topicIds: ["t6"],
        media: {
          title: item.title,
          description: description.slice(0, 900),
          channelTitle: item.by || "HN",
          publishedAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
          viewCount: item.score,
          likeCount: item.descendants,
          tags,
          orientation: "landscape",
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Social News Aggregators",
        clusterId: clusterIdFor(platform, tags, ["t6"]),
        upvotes: item.score || 10,
      });
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
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
  limit = 6
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
            score: number;
            thumbnail?: string;
            created_utc: number;
            num_comments: number;
            link_flair_text?: string;
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
      if (fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["reddit", subreddit, d.link_flair_text || "discussion"].filter(Boolean);
      const description = stripExternalUrls(
        (d.selftext || d.title).slice(0, 900) +
          `\n\nr/${subreddit} · ${d.score} upvotes · ${d.num_comments} comments`
      );
      const thumb =
        d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : undefined;
      const post = publishPost({
        authorId: SERVICE_USER_ID,
        kind: "news",
        title: d.title.slice(0, 120),
        body: stripExternalUrls(
          `${description}\n\nComment prompt: Agree with the community take, or push back? Keep the thread here.`
        ),
        topicIds: ["t6"],
        imageUrls: thumb ? [thumb] : undefined,
        media: {
          title: d.title,
          description,
          channelTitle: `r/${subreddit}`,
          thumbnailUrl: thumb,
          publishedAt: new Date(d.created_utc * 1000).toISOString(),
          viewCount: d.score,
          likeCount: d.num_comments,
          tags,
          orientation: "landscape",
        },
        sourceHidden: true,
        fingerprint: fp,
        sourcePlatform: platform,
        sourceGroup: "Social News Aggregators",
        clusterId: clusterIdFor(platform, tags, ["t6"]),
        upvotes: Math.min(d.score, 500),
      });
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
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
      if (fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["github", "opensource", (repo.language || "code").toLowerCase()];
      const description = stripExternalUrls(
        `${repo.description || name} — trending open-source (${repo.stars || 0}★). Language: ${repo.language || "n/a"}.`
      );
      const post = publishPost({
        authorId: SERVICE_USER_ID,
        kind: "article",
        title: `Trending: ${name}`.slice(0, 120),
        body: stripExternalUrls(
          `${description}\n\nDev prompt: Would you star this? Comment on use-cases — repo links stay in-app only as titles.`
        ),
        topicIds: ["t6"],
        media: {
          title: name,
          description,
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
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
    }
    if (!posts.length && skipped === 0) throw new Error("Empty trending payload");
    return { platform, imported: posts.length, skipped, posts };
  } catch {
    // Seed-like fallbacks so the feed still shows GitHub group variety
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
      if (fingerprintExists(fp)) {
        skipped += 1;
        continue;
      }
      const tags = ["github", "opensource", repo.language.toLowerCase()];
      const post = publishPost({
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
      if (getState().posts.find((p) => p.id === post.id)) posts.push(post);
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
  const enabled = new Set(getState().settings.enabledSources);
  const results: IngestResult[] = [];

  if (enabled.has("youtube")) {
    results.push(...(await syncAllYoutubeChannels(opts?.youtubeLimit ?? 4)));
  }
  for (const src of RSS_SOURCES) {
    if (!enabled.has(src.platform)) continue;
    results.push(
      await syncRssSource(
        src.platform,
        src.url,
        src.topicId,
        src.group,
        src.kind,
        src.tags,
        opts?.rssLimit ?? 5
      )
    );
  }
  if (enabled.has("hackernews")) results.push(await syncHackerNews(opts?.rssLimit ?? 6));
  if (enabled.has("reddit")) {
    results.push(await syncReddit("technology", 150, 5));
    results.push(await syncReddit("artificial", 100, 4));
  }
  if (enabled.has("github")) results.push(await syncGithubTrending(5));

  const ranAt = new Date().toISOString();
  mutate((s) => {
    s.settings.lastIngestAt = ranAt;
  });

  const groups = Array.from(
    new Set(
      getState()
        .posts.map((p) => p.sourceGroup)
        .filter(Boolean) as string[]
    )
  );

  return {
    results,
    totalImported: results.reduce((n, r) => n + r.imported, 0),
    ranAt,
    groups,
  };
}

export { detectOrientation, RSS_SOURCES };
