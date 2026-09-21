import type { Prisma } from "@prisma/client";
import type {
  AppSettings,
  ChatMessage,
  ChatThread,
  Comment,
  Friendship,
  Follow,
  MediaDetails,
  NotificationItem,
  Post,
  Topic,
  User,
} from "./types";
import { formatIngestBody, looksLikeHtml, mergeUniqueUrls } from "./content";

export function mapUser(u: {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  profilePublic: boolean;
  joinedAt: Date;
  location: string | null;
  interests: string[];
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  postsCount: number;
  rating: number;
  isAdmin: boolean;
  isService: boolean;
  email?: string | null;
  googleId?: string | null;
}): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    profilePublic: u.profilePublic,
    joinedAt: u.joinedAt.toISOString(),
    location: u.location ?? undefined,
    interests: u.interests,
    followersCount: u.followersCount,
    followingCount: u.followingCount,
    friendsCount: u.friendsCount,
    postsCount: u.postsCount,
    rating: u.rating,
    isAdmin: u.isAdmin,
    isService: u.isService,
    email: u.email ?? undefined,
    googleId: u.googleId ?? undefined,
  };
}

export function mapTopic(t: {
  id: string;
  slug: string;
  name: string;
  description: string;
  postCount: number;
  color: string;
}): Topic {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    postCount: t.postCount,
    color: t.color,
  };
}

export function mapPost(
  p: {
    id: string;
    authorId: string;
    kind: string;
    title: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    upvotes: number;
    downvotes: number;
    likes: number;
    commentCount: number;
    media: Prisma.JsonValue | null;
    imageUrls: string[];
    sourceHidden: boolean;
    bookmarkedBy: string[];
    likedBy: string[];
    voters: Prisma.JsonValue;
    fingerprint: string | null;
    sourcePlatform: string | null;
    clusterId: string | null;
    sourceGroup: string | null;
    topics?: { topicId: string }[];
  }
): Post {
  const voters =
    p.voters && typeof p.voters === "object" && !Array.isArray(p.voters)
      ? (p.voters as Record<string, 1 | -1>)
      : {};
  const formatted = looksLikeHtml(p.body)
    ? formatIngestBody(p.body)
    : { body: p.body, imageUrls: [] as string[], youtubeVideoId: undefined as string | undefined };
  const media = ((p.media as MediaDetails | null) ?? undefined) as MediaDetails | undefined;
  const mediaDescRaw = media?.description;
  const mediaDesc =
    mediaDescRaw && looksLikeHtml(mediaDescRaw)
      ? formatIngestBody(mediaDescRaw).body
      : mediaDescRaw;
  const youtubeVideoId = media?.youtubeVideoId || formatted.youtubeVideoId;
  const imageUrls = mergeUniqueUrls(
    p.imageUrls,
    formatted.imageUrls,
    media?.thumbnailUrl ? [media.thumbnailUrl] : undefined
  );
  const description =
    mediaDesc && mediaDesc.trim() && mediaDesc.trim() !== formatted.body.trim()
      ? mediaDesc
      : media?.artist || media?.album
        ? mediaDesc
        : undefined;
  return {
    id: p.id,
    authorId: p.authorId,
    kind: p.kind as Post["kind"],
    title: looksLikeHtml(p.title) ? formatIngestBody(p.title).body.slice(0, 120) : p.title,
    body: formatted.body,
    topicIds: p.topics?.map((t) => t.topicId) ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    upvotes: p.upvotes,
    downvotes: p.downvotes,
    likes: p.likes,
    commentCount: p.commentCount,
    media: media
      ? {
          ...media,
          description,
          youtubeVideoId,
        }
      : youtubeVideoId
        ? { youtubeVideoId, orientation: "landscape" }
        : undefined,
    imageUrls: imageUrls.length ? imageUrls : undefined,
    sourceHidden: p.sourceHidden,
    bookmarkedBy: p.bookmarkedBy,
    likedBy: p.likedBy,
    voters,
    fingerprint: p.fingerprint ?? undefined,
    sourcePlatform: (p.sourcePlatform as Post["sourcePlatform"]) ?? undefined,
    clusterId: p.clusterId ?? undefined,
    sourceGroup: p.sourceGroup ?? undefined,
  };
}

export function mapComment(c: {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
}): Comment {
  return {
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    parentId: c.parentId,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    upvotes: c.upvotes,
    downvotes: c.downvotes,
  };
}

export function mapFriendship(f: {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  createdAt: Date;
}): Friendship {
  return {
    id: f.id,
    userId: f.userId,
    friendId: f.friendId,
    status: f.status as Friendship["status"],
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapFollow(f: {
  followerId: string;
  followingId: string;
  createdAt: Date;
}): Follow {
  return {
    followerId: f.followerId,
    followingId: f.followingId,
    createdAt: f.createdAt.toISOString(),
  };
}

export function mapChatThread(
  t: {
    id: string;
    type: string;
    title: string;
    lastMessageAt: Date;
    lastPreview: string;
    status: string;
    requestedById: string | null;
    members?: { userId: string }[];
  }
): ChatThread {
  return {
    id: t.id,
    type: t.type as ChatThread["type"],
    title: t.title,
    memberIds: t.members?.map((m) => m.userId) ?? [],
    lastMessageAt: t.lastMessageAt.toISOString(),
    lastPreview: t.lastPreview,
    status: t.status as ChatThread["status"],
    requestedBy: t.requestedById ?? undefined,
  };
}

export function mapChatMessage(m: {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}): ChatMessage {
  return {
    id: m.id,
    threadId: m.threadId,
    senderId: m.senderId,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export function mapNotification(n: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: Date;
}): NotificationItem {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type as NotificationItem["type"],
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export function mapSettings(s: {
  visibility: string;
  dailyIngestHour: number;
  lastIngestAt: Date | null;
  ingestEnabled: boolean;
  youtubeChannelIds: string[];
  enabledSources: string[];
  currentUserId: string | null;
}): AppSettings & { currentUserId: string | null } {
  return {
    visibility: s.visibility as AppSettings["visibility"],
    dailyIngestHour: s.dailyIngestHour,
    lastIngestAt: s.lastIngestAt?.toISOString() ?? null,
    ingestEnabled: s.ingestEnabled,
    youtubeChannelIds: s.youtubeChannelIds,
    enabledSources: s.enabledSources as AppSettings["enabledSources"],
    currentUserId: s.currentUserId,
  };
}
