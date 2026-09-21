import { curatedArtists } from "./store";
import { clusterIdFor } from "./similarity";
import { syncAllYoutubeChannels, runDailyIngest } from "./scrapers";
import {
  createPost,
  fingerprintExists,
  getSettings,
  listPosts,
  listTopics,
  uid,
  SERVICE_USER_ID,
} from "./db";
import { stripExternalUrls } from "./content";
import type { Post } from "./types";

export type YoutubeSyncResult = {
  imported: number;
  posts: Post[];
  source: "youtube-rss" | "curated-fallback";
  channels: string[];
  detailsFetched: string[];
  detailsPending: string[];
};

/**
 * Admin ingest: YouTube channel recent uploads via public RSS (no API key).
 * Posts are created as public service-role records. Duplicates skipped by video id.
 */
export async function syncYoutubeShorts(limit = 5): Promise<YoutubeSyncResult> {
  const detailsFetched = [
    "title",
    "description",
    "channelId",
    "publishedAt",
    "thumbnail",
    "videoId",
    "orientationGuess",
    "discussionPrompt",
  ];
  const detailsPending = [
    "captionTracks",
    "exactDuration",
    "viewCount",
    "likeCount",
    "chapters",
    "topicClassifierV2",
  ];

  const results = await syncAllYoutubeChannels(limit);
  const posts = results.flatMap((r) => r.posts);
  const imported = results.reduce((n, r) => n + r.imported, 0);
  const channels = (await getSettings()).youtubeChannelIds;

  if (imported > 0) {
    return {
      imported,
      posts,
      source: "youtube-rss",
      channels,
      detailsFetched,
      detailsPending,
    };
  }

  const created: Post[] = [];
  for (const item of [
    {
      id: "aqz-KE-bpKQ",
      title: "Big Buck Bunny moments",
      channel: "Blender Foundation",
      tags: ["shorts", "animation"],
    },
  ]) {
    const fp = `yt:${item.id}`;
    if (await fingerprintExists(fp)) continue;
    const post = await createPost({
      id: uid("ps"),
      authorId: SERVICE_USER_ID,
      kind: "short",
      title: item.title,
      body: stripExternalUrls(
        `${item.title} from ${item.channel}. Enriched for ConnectHub — engage in comments without leaving.`
      ),
      topicIds: ["t2"],
      media: {
        title: item.title,
        description: `Curated short · ${item.channel}`,
        channelTitle: item.channel,
        youtubeVideoId: item.id,
        tags: item.tags,
        thumbnailUrl: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        publishedAt: new Date().toISOString(),
        width: 1080,
        height: 1920,
        orientation: "portrait",
      },
      fingerprint: fp,
      sourcePlatform: "youtube",
      sourceGroup: "YouTube Channels",
      clusterId: clusterIdFor("youtube", item.tags, ["t2"]),
    });
    created.push(post);
  }

  return {
    imported: created.length,
    posts: created,
    source: "curated-fallback",
    channels,
    detailsFetched,
    detailsPending,
  };
}

export async function syncMusicFeed(): Promise<{ imported: number; posts: Post[] }> {
  const created: Post[] = [];
  for (const a of curatedArtists) {
    const fp = `yt:${a.youtubeVideoId}`;
    if (await fingerprintExists(fp)) continue;
    const tags = ["music", a.genre.toLowerCase()];
    const post = await createPost({
      id: uid("pm"),
      authorId: "u3",
      kind: "music",
      title: `${a.artist} — ${a.track}`,
      body: a.description,
      topicIds: ["t1"],
      media: {
        title: a.track,
        artist: a.artist,
        album: a.album,
        genre: a.genre,
        description: a.description,
        youtubeVideoId: a.youtubeVideoId,
        tags,
        thumbnailUrl: `https://i.ytimg.com/vi/${a.youtubeVideoId}/hqdefault.jpg`,
        channelTitle: a.artist,
        width: 1920,
        height: 1080,
        orientation: "landscape",
      },
      fingerprint: fp,
      sourcePlatform: "music",
      sourceGroup: "Music Artists",
      clusterId: clusterIdFor("music", tags, ["t1"]),
    });
    created.push(post);
  }
  return { imported: created.length, posts: created };
}

export function listMusicCatalog() {
  return curatedArtists.map((a) => ({
    ...a,
    playableInApp: true,
    detailsFetched: ["artist", "track", "album", "genre", "description", "thumbnail"],
    detailsToFetch: ["lyricsSnippet", "similarArtists", "releaseCredits", "tempoBpm"],
  }));
}

export async function publicFeedStats() {
  const posts = await listPosts();
  const topics = await listTopics();
  const settings = await getSettings();
  const groups = Array.from(
    new Set(posts.map((p) => p.sourceGroup).filter(Boolean) as string[])
  );
  return {
    posts: posts.length,
    shorts: posts.filter((p) => p.kind === "short").length,
    music: posts.filter((p) => p.kind === "music").length,
    articles: posts.filter((p) => p.kind === "article" || p.kind === "news").length,
    topics: topics.length,
    groups,
    visibility: settings.visibility,
  };
}

export { runDailyIngest };
