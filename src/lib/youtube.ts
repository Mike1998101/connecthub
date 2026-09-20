import { curatedArtists, curatedShortIds, getState, mutate, stripExternalUrls, uid } from "./store";
import type { Post } from "./types";

export type YoutubeSyncResult = {
  imported: number;
  posts: Post[];
  source: "youtube-api" | "curated";
  detailsFetched: string[];
  detailsPending: string[];
};

/**
 * Ingest Shorts-style videos into public posts.
 * Uses YouTube Data API when YOUTUBE_API_KEY is set; otherwise curated catalog.
 * Never stores public outbound links — only video ids for in-app embed.
 */
export async function syncYoutubeShorts(limit = 5): Promise<YoutubeSyncResult> {
  const key = process.env.YOUTUBE_API_KEY;
  const detailsFetched = [
    "title",
    "description",
    "channelTitle",
    "publishedAt",
    "thumbnails",
    "duration",
    "viewCount",
    "likeCount",
    "tags",
  ];
  const detailsPending = [
    "captionTracks",
    "chapters",
    "relatedInAppTopics",
    "moderationScore",
    "artistFingerprint",
  ];

  if (key) {
    try {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("videoDuration", "short");
      searchUrl.searchParams.set("order", "viewCount");
      searchUrl.searchParams.set("maxResults", String(limit));
      searchUrl.searchParams.set("q", "shorts music");
      searchUrl.searchParams.set("key", key);

      const searchRes = await fetch(searchUrl.toString());
      if (!searchRes.ok) throw new Error(`YouTube search ${searchRes.status}`);
      const searchJson = (await searchRes.json()) as {
        items?: Array<{ id: { videoId: string }; snippet: Record<string, string> }>;
      };
      const ids = (searchJson.items ?? []).map((i) => i.id.videoId).filter(Boolean);
      if (ids.length === 0) throw new Error("No videos");

      const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      videosUrl.searchParams.set("part", "snippet,contentDetails,statistics");
      videosUrl.searchParams.set("id", ids.join(","));
      videosUrl.searchParams.set("key", key);
      const videosRes = await fetch(videosUrl.toString());
      const videosJson = (await videosRes.json()) as {
        items?: Array<{
          id: string;
          snippet: {
            title: string;
            description: string;
            channelTitle: string;
            publishedAt: string;
            tags?: string[];
            thumbnails?: { high?: { url: string } };
          };
          contentDetails?: { duration?: string };
          statistics?: { viewCount?: string; likeCount?: string };
        }>;
      };

      const created: Post[] = [];
      mutate((s) => {
        for (const item of videosJson.items ?? []) {
          const existing = s.posts.find((p) => p.media?.youtubeVideoId === item.id);
          if (existing) continue;
          const post: Post = {
            id: uid("ps"),
            authorId: "u1",
            kind: "short",
            title: item.snippet.title,
            body: stripExternalUrls(
              `${item.snippet.description || item.snippet.title}\n\nChannel: ${item.snippet.channelTitle}`
            ),
            topicIds: ["t2"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            upvotes: 0,
            downvotes: 0,
            likes: 0,
            commentCount: 0,
            media: {
              title: item.snippet.title,
              description: stripExternalUrls(item.snippet.description || ""),
              channelTitle: item.snippet.channelTitle,
              youtubeVideoId: item.id,
              publishedAt: item.snippet.publishedAt,
              tags: item.snippet.tags ?? ["shorts"],
              thumbnailUrl: item.snippet.thumbnails?.high?.url,
              viewCount: Number(item.statistics?.viewCount ?? 0),
              likeCount: Number(item.statistics?.likeCount ?? 0),
              durationSec: parseIsoDuration(item.contentDetails?.duration),
              width: 1080,
              height: 1920,
            },
            sourceHidden: true,
            bookmarkedBy: [],
            likedBy: [],
            voters: {},
          };
          s.posts.unshift(post);
          created.push(post);
        }
      });

      return {
        imported: created.length,
        posts: created,
        source: "youtube-api",
        detailsFetched,
        detailsPending,
      };
    } catch {
      // fall through to curated
    }
  }

  const created: Post[] = [];
  mutate((s) => {
    for (const item of curatedShortIds.slice(0, limit)) {
      const existing = s.posts.find((p) => p.media?.youtubeVideoId === item.id);
      if (existing) continue;
      const post: Post = {
        id: uid("ps"),
        authorId: "u1",
        kind: "short",
        title: item.title,
        body: stripExternalUrls(
          `${item.title} from ${item.channel}. Enriched for ConnectHub feed — engage in comments without leaving.`
        ),
        topicIds: ["t2"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        upvotes: Math.floor(Math.random() * 80),
        downvotes: 0,
        likes: Math.floor(Math.random() * 50),
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
        },
        sourceHidden: true,
        bookmarkedBy: [],
        likedBy: [],
        voters: {},
      };
      s.posts.unshift(post);
      created.push(post);
    }
  });

  return {
    imported: created.length,
    posts: created,
    source: "curated",
    detailsFetched,
    detailsPending,
  };
}

export function syncMusicFeed(): { imported: number; posts: Post[] } {
  const created: Post[] = [];
  mutate((s) => {
    for (const a of curatedArtists) {
      const exists = s.posts.some(
        (p) => p.kind === "music" && p.media?.youtubeVideoId === a.youtubeVideoId
      );
      if (exists) continue;
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
          tags: ["music", a.genre.toLowerCase()],
          thumbnailUrl: `https://i.ytimg.com/vi/${a.youtubeVideoId}/hqdefault.jpg`,
          channelTitle: a.artist,
        },
        sourceHidden: true,
        bookmarkedBy: [],
        likedBy: [],
        voters: {},
      };
      s.posts.unshift(post);
      created.push(post);
    }
  });
  return { imported: created.length, posts: created };
}

function parseIsoDuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

export function listMusicCatalog() {
  return curatedArtists.map((a) => ({
    ...a,
    // Explicitly no public URL fields
    playableInApp: true,
    detailsFetched: ["artist", "track", "album", "genre", "description", "thumbnail"],
    detailsToFetch: ["lyricsSnippet", "similarArtists", "releaseCredits", "tempoBpm"],
  }));
}

export function publicFeedStats() {
  const s = getState();
  return {
    posts: s.posts.length,
    shorts: s.posts.filter((p) => p.kind === "short").length,
    music: s.posts.filter((p) => p.kind === "music").length,
    topics: s.topics.length,
  };
}
