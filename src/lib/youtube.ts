import { curatedArtists, getState, mutate, stripExternalUrls, uid, SERVICE_USER_ID } from "./store";
import { clusterIdFor } from "./similarity";
import { syncAllYoutubeChannels, runDailyIngest } from "./scrapers";
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
  const channels = getState().settings.youtubeChannelIds;

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
  mutate((s) => {
    for (const item of [
      {
        id: "aqz-KE-bpKQ",
        title: "Big Buck Bunny moments",
        channel: "Blender Foundation",
        tags: ["shorts", "animation"],
      },
    ]) {
      const fp = `yt:${item.id}`;
      if (s.posts.some((p) => p.fingerprint === fp)) continue;
      const post: Post = {
        id: uid("ps"),
        authorId: SERVICE_USER_ID,
        kind: "short",
        title: item.title,
        body: stripExternalUrls(
          `${item.title} from ${item.channel}. Enriched for ConnectHub — engage in comments without leaving.`
        ),
        topicIds: ["t2"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 12,
        downvotes: 0,
        likes: 8,
        commentCount: 0,
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
        sourceHidden: true,
        bookmarkedBy: [],
        likedBy: [],
        voters: {},
        fingerprint: fp,
        sourcePlatform: "youtube",
        sourceGroup: "YouTube Channels",
        clusterId: clusterIdFor("youtube", item.tags, ["t2"]),
      };
      s.posts.unshift(post);
      created.push(post);
    }
  });

  return {
    imported: created.length,
    posts: created,
    source: "curated-fallback",
    channels,
    detailsFetched,
    detailsPending,
  };
}

export function syncMusicFeed(): { imported: number; posts: Post[] } {
  const created: Post[] = [];
  mutate((s) => {
    for (const a of curatedArtists) {
      const fp = `yt:${a.youtubeVideoId}`;
      const exists = s.posts.some((p) => p.fingerprint === fp && p.kind === "music");
      if (exists) continue;
      const tags = ["music", a.genre.toLowerCase()];
      const post: Post = {
        id: uid("pm"),
        authorId: "u3",
        kind: "music",
        title: `${a.artist} — ${a.track}`,
        body: a.description,
        topicIds: ["t1"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: 10,
        downvotes: 0,
        likes: 8,
        commentCount: 0,
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
        sourceHidden: true,
        bookmarkedBy: [],
        likedBy: [],
        voters: {},
        fingerprint: fp,
        sourcePlatform: "music",
        sourceGroup: "Music Artists",
        clusterId: clusterIdFor("music", tags, ["t1"]),
      };
      s.posts.unshift(post);
      created.push(post);
    }
  });
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

export function publicFeedStats() {
  const s = getState();
  const groups = Array.from(
    new Set(s.posts.map((p) => p.sourceGroup).filter(Boolean) as string[])
  );
  return {
    posts: s.posts.length,
    shorts: s.posts.filter((p) => p.kind === "short").length,
    music: s.posts.filter((p) => p.kind === "music").length,
    articles: s.posts.filter((p) => p.kind === "article" || p.kind === "news").length,
    topics: s.topics.length,
    groups,
    visibility: s.settings.visibility,
  };
}

export { runDailyIngest };
