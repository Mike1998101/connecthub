import { promises as fs } from "fs";
import path from "path";
import type { Post } from "./types";

export type ActivityEvent = {
  id: string;
  userId: string;
  type: "search" | "view" | "watch" | "like" | "bookmark";
  query?: string;
  postId?: string;
  topicIds?: string[];
  kind?: string;
  tags?: string[];
  createdAt: string;
};

export type UserPrefs = {
  darkMode?: boolean;
  language?: string;
  region?: string;
  reactionPrefs?: string[];
  notifications?: Record<string, boolean>;
  accessibility?: Record<string, boolean>;
  mediaAutoplay?: boolean;
  profileLocking?: boolean;
  profileDetailsPublic?: boolean;
  howPeopleFindYou?: "everyone" | "friends" | "nobody";
  defaultAudience?: "public" | "friends" | "followers";
  postsVisibility?: string;
  storiesVisibility?: string;
  shortsVisibility?: string;
  followerPublicContent?: boolean;
  profileTagging?: "everyone" | "friends" | "off";
  blockedUserIds?: string[];
  familyCenterEnabled?: boolean;
  privacyCheckupDone?: boolean;
};

const root = path.join(process.cwd(), ".data");

async function ensureDir() {
  await fs.mkdir(root, { recursive: true });
}

function activityPath(userId: string) {
  return path.join(root, `activity-${userId}.json`);
}

function prefsPath(userId: string) {
  return path.join(root, `prefs-${userId}.json`);
}

export async function loadActivity(userId: string): Promise<ActivityEvent[]> {
  try {
    const raw = await fs.readFile(activityPath(userId), "utf8");
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
  }
}

export async function recordActivity(
  event: Omit<ActivityEvent, "id" | "createdAt"> & { id?: string }
): Promise<ActivityEvent> {
  await ensureDir();
  const full: ActivityEvent = {
    ...event,
    id: event.id || `act_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const prev = await loadActivity(event.userId);
  const next = [full, ...prev].slice(0, 400);
  await fs.writeFile(activityPath(event.userId), JSON.stringify(next, null, 2));
  return full;
}

export async function loadPrefs(userId: string): Promise<UserPrefs> {
  try {
    const raw = await fs.readFile(prefsPath(userId), "utf8");
    return JSON.parse(raw) as UserPrefs;
  } catch {
    return {
      darkMode: false,
      language: "en",
      region: "US",
      mediaAutoplay: true,
      profileDetailsPublic: true,
      howPeopleFindYou: "everyone",
      defaultAudience: "public",
      postsVisibility: "public",
      storiesVisibility: "friends",
      shortsVisibility: "public",
      followerPublicContent: true,
      profileTagging: "friends",
      blockedUserIds: [],
      notifications: {
        likes: true,
        comments: true,
        follows: true,
        friendRequests: true,
        messages: true,
      },
    };
  }
}

export async function savePrefs(userId: string, patch: UserPrefs): Promise<UserPrefs> {
  await ensureDir();
  const prev = await loadPrefs(userId);
  const next = { ...prev, ...patch };
  await fs.writeFile(prefsPath(userId), JSON.stringify(next, null, 2));
  return next;
}

/** Score posts against search/view/watch history for personalized next items */
export function recommendFromHistory(
  posts: Post[],
  activity: ActivityEvent[],
  opts?: { excludeIds?: Set<string>; kind?: string; limit?: number }
): Post[] {
  const exclude = opts?.excludeIds || new Set<string>();
  const limit = opts?.limit ?? 12;

  const queryBag = new Map<string, number>();
  const topicBag = new Map<string, number>();
  const tagBag = new Map<string, number>();
  const kindBoost = new Map<string, number>();

  for (const ev of activity.slice(0, 120)) {
    const weight =
      ev.type === "watch" ? 4 : ev.type === "view" ? 2 : ev.type === "search" ? 3 : 1.5;
    if (ev.query) {
      for (const w of ev.query.toLowerCase().split(/\W+/).filter((x) => x.length > 2)) {
        queryBag.set(w, (queryBag.get(w) || 0) + weight);
      }
    }
    for (const t of ev.topicIds || []) topicBag.set(t, (topicBag.get(t) || 0) + weight);
    for (const t of ev.tags || []) tagBag.set(t.toLowerCase(), (tagBag.get(t.toLowerCase()) || 0) + weight);
    if (ev.kind) kindBoost.set(ev.kind, (kindBoost.get(ev.kind) || 0) + weight * 0.5);
  }

  const scored = posts
    .filter((p) => !exclude.has(p.id))
    .filter((p) => (opts?.kind ? p.kind === opts.kind : true))
    .map((p) => {
      let score = Math.log10(2 + p.upvotes + p.likes + p.commentCount);
      const hay = `${p.title} ${p.body} ${(p.media?.tags || []).join(" ")}`.toLowerCase();
      for (const [w, wgt] of queryBag) {
        if (hay.includes(w)) score += wgt;
      }
      for (const tid of p.topicIds) score += topicBag.get(tid) || 0;
      for (const tag of p.media?.tags || []) score += tagBag.get(tag.toLowerCase()) || 0;
      score += kindBoost.get(p.kind) || 0;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.p);
}

export function searchPosts(posts: Post[], query: string): Post[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return posts
    .map((p) => {
      const hay = [
        p.title,
        p.body,
        p.kind,
        p.sourcePlatform,
        p.sourceGroup,
        p.media?.title,
        p.media?.artist,
        p.media?.album,
        p.media?.genre,
        p.media?.channelTitle,
        p.media?.description,
        ...(p.media?.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (hay.includes(t)) score += t.length > 4 ? 3 : 2;
        if (p.title.toLowerCase().includes(t)) score += 4;
        if (p.media?.artist?.toLowerCase().includes(t)) score += 5;
      }
      if (p.media?.youtubeVideoId || (p.imageUrls && p.imageUrls.length)) score += 0.5;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}
