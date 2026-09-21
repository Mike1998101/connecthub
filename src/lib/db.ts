import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  mapChatMessage,
  mapChatThread,
  mapComment,
  mapFollow,
  mapFriendship,
  mapNotification,
  mapPost,
  mapSettings,
  mapTopic,
  mapUser,
} from "./mappers";
import type {
  AppSettings,
  Comment,
  MediaDetails,
  Post,
  SourcePlatform,
  User,
} from "./types";
import { DEFAULT_YT_CHANNELS } from "./channels";

export const SERVICE_USER_ID = "u_service";
export const ADMIN_USER_ID = "u5";
export const SESSION_COOKIE = "connecthub_uid";

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export { stripExternalUrls } from "./content";

const defaultSettingsData = {
  id: 1,
  visibility: "public",
  dailyIngestHour: 8,
  lastIngestAt: null as Date | null,
  ingestEnabled: true,
  youtubeChannelIds: DEFAULT_YT_CHANNELS.map((c) => c.id),
  enabledSources: [
    "youtube",
    "techcrunch",
    "theverge",
    "wired",
    "gizmodo",
    "hackernews",
    "reddit",
    "github",
    "devto",
    "music",
  ],
  currentUserId: "u5" as string | null,
};

export async function ensureSettings() {
  return prisma.appSettings.upsert({
    where: { id: 1 },
    create: defaultSettingsData,
    update: {},
  });
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const fromCookie = jar.get(SESSION_COOKIE)?.value;
    if (fromCookie) return fromCookie;
  } catch {
    // non-request context (cron/scripts)
  }
  const s = await ensureSettings();
  return s.currentUserId;
}

export async function setCurrentUserId(userId: string | null) {
  await ensureSettings();
  await prisma.appSettings.update({
    where: { id: 1 },
    data: { currentUserId: userId },
  });
  try {
    const jar = await cookies();
    if (userId) {
      jar.set(SESSION_COOKIE, userId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      jar.delete(SESSION_COOKIE);
    }
  } catch {
    // ignore outside request
  }
}

export async function getSettings(): Promise<AppSettings & { currentUserId: string | null }> {
  const s = await ensureSettings();
  return mapSettings(s);
}

export async function updateSettings(data: Partial<AppSettings> & { currentUserId?: string | null }) {
  await ensureSettings();
  const updated = await prisma.appSettings.update({
    where: { id: 1 },
    data: {
      ...(data.visibility != null ? { visibility: data.visibility } : {}),
      ...(data.dailyIngestHour != null ? { dailyIngestHour: data.dailyIngestHour } : {}),
      ...(data.ingestEnabled != null ? { ingestEnabled: data.ingestEnabled } : {}),
      ...(data.lastIngestAt !== undefined
        ? { lastIngestAt: data.lastIngestAt ? new Date(data.lastIngestAt) : null }
        : {}),
      ...(data.youtubeChannelIds ? { youtubeChannelIds: data.youtubeChannelIds } : {}),
      ...(data.enabledSources ? { enabledSources: data.enabledSources } : {}),
      ...(data.currentUserId !== undefined ? { currentUserId: data.currentUserId } : {}),
    },
  });
  return mapSettings(updated);
}

export async function getUserById(id: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? mapUser(u) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const u = await prisma.user.findUnique({ where: { username } });
  return u ? mapUser(u) : null;
}

export async function isAdmin(userId: string | null) {
  if (!userId) return false;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return !!u?.isAdmin;
}

export async function listUsers() {
  const rows = await prisma.user.findMany({ orderBy: { rating: "desc" } });
  return rows.map(mapUser);
}

export async function listTopics() {
  const rows = await prisma.topic.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapTopic);
}

const postInclude = { topics: true } as const;

export async function listPosts(opts?: {
  topicId?: string;
  group?: string;
  authorId?: string;
  bookmarkedBy?: string;
}) {
  const where: Prisma.PostWhereInput = {};
  if (opts?.group) where.sourceGroup = opts.group;
  if (opts?.authorId) where.authorId = opts.authorId;
  if (opts?.bookmarkedBy) where.bookmarkedBy = { has: opts.bookmarkedBy };
  if (opts?.topicId) where.topics = { some: { topicId: opts.topicId } };

  const rows = await prisma.post.findMany({
    where,
    include: postInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapPost);
}

export async function getPostById(id: string): Promise<Post | null> {
  const row = await prisma.post.findUnique({ where: { id }, include: postInclude });
  return row ? mapPost(row) : null;
}

export async function fingerprintExists(fp: string) {
  const n = await prisma.post.count({ where: { fingerprint: fp } });
  return n > 0;
}

export async function createPost(input: {
  id?: string;
  authorId: string;
  kind: string;
  title: string;
  body: string;
  topicIds: string[];
  media?: MediaDetails | null;
  imageUrls?: string[];
  sourceHidden?: boolean;
  fingerprint?: string;
  sourcePlatform?: string;
  clusterId?: string;
  sourceGroup?: string;
  upvotes?: number;
  downvotes?: number;
  likes?: number;
}): Promise<Post> {
  if (input.fingerprint) {
    const existing = await prisma.post.findUnique({
      where: { fingerprint: input.fingerprint },
      include: postInclude,
    });
    if (existing) return mapPost(existing);
  }

  const id = input.id || uid("p");
  const row = await prisma.post.create({
    data: {
      id,
      authorId: input.authorId,
      kind: input.kind,
      title: input.title.slice(0, 120),
      body: input.body,
      media: (input.media ?? undefined) as Prisma.InputJsonValue | undefined,
      imageUrls: input.imageUrls ?? [],
      sourceHidden: input.sourceHidden ?? true,
      fingerprint: input.fingerprint,
      sourcePlatform: input.sourcePlatform,
      clusterId: input.clusterId,
      sourceGroup: input.sourceGroup,
      upvotes: input.upvotes ?? 0,
      downvotes: input.downvotes ?? 0,
      likes: input.likes ?? 0,
      voters: {},
      topics: {
        create: input.topicIds.map((topicId) => ({ topicId })),
      },
    },
    include: postInclude,
  });

  await prisma.user.update({
    where: { id: input.authorId },
    data: { postsCount: { increment: 1 } },
  });
  if (input.topicIds.length) {
    await prisma.topic.updateMany({
      where: { id: { in: input.topicIds } },
      data: { postCount: { increment: 1 } },
    });
  }

  return mapPost(row);
}

export async function nestComments(postId: string): Promise<Comment[]> {
  const all = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
  const mapped = all.map(mapComment);
  const byParent = new Map<string | null, Comment[]>();
  for (const c of mapped) {
    const key = c.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push({ ...c, replies: [] });
  }
  const attach = (nodes: Comment[]): Comment[] =>
    nodes.map((n) => ({
      ...n,
      replies: attach(byParent.get(n.id) ?? []),
    }));
  return attach(byParent.get(null) ?? []);
}

export async function areFriends(a: string, b: string) {
  const n = await prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [
        { userId: a, friendId: b },
        { userId: b, friendId: a },
      ],
    },
  });
  return n > 0;
}

export async function listSourceGroups() {
  const rows = await prisma.post.findMany({
    where: { sourceGroup: { not: null } },
    select: { sourceGroup: true },
    distinct: ["sourceGroup"],
  });
  return rows.map((r) => r.sourceGroup!).filter(Boolean);
}

export {
  prisma,
  mapUser,
  mapPost,
  mapTopic,
  mapComment,
  mapFriendship,
  mapFollow,
  mapChatThread,
  mapChatMessage,
  mapNotification,
};
