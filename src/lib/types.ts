export type FeedSort = "chronological" | "trending" | "topic";

export type PostKind =
  | "text"
  | "image"
  | "video"
  | "short"
  | "music"
  | "link"
  | "article"
  | "news";

export type MediaOrientation = "portrait" | "landscape" | "square";

export type SourcePlatform =
  | "youtube"
  | "techcrunch"
  | "theverge"
  | "wired"
  | "gizmodo"
  | "hackernews"
  | "reddit"
  | "producthunt"
  | "github"
  | "devto"
  | "music"
  | "community"
  | "bloomberg"
  | "cnbc";

export interface User {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  profilePublic: boolean;
  joinedAt: string;
  location?: string;
  interests: string[];
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  postsCount: number;
  rating: number;
  isAdmin?: boolean;
  isService?: boolean;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string;
  postCount: number;
  color: string;
}

export interface MediaDetails {
  title?: string;
  description?: string;
  channelTitle?: string;
  artist?: string;
  album?: string;
  genre?: string;
  durationSec?: number;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  thumbnailUrl?: string;
  /** YouTube video id only — never exposed as an outbound link */
  youtubeVideoId?: string;
  audioPreviewUrl?: string;
  width?: number;
  height?: number;
  orientation?: MediaOrientation;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  replies?: Comment[];
}

export interface Post {
  id: string;
  authorId: string;
  kind: PostKind;
  title: string;
  body: string;
  topicIds: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  likes: number;
  commentCount: number;
  media?: MediaDetails;
  imageUrls?: string[];
  /** External URLs are stripped for retention; kept only server-side if needed */
  sourceHidden: boolean;
  bookmarkedBy: string[];
  likedBy: string[];
  voters: Record<string, 1 | -1>;
  /** Dedup fingerprint e.g. yt:VIDEO_ID or rss:guid */
  fingerprint?: string;
  sourcePlatform?: SourcePlatform;
  /** Soft cluster for similar-post suggestions */
  clusterId?: string;
  sourceGroup?: string;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  type: "peer" | "group";
  title: string;
  memberIds: string[];
  lastMessageAt: string;
  lastPreview: string;
  /** peer DMs from non-friends start as request until accepted */
  status: "open" | "request";
  requestedBy?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type NotificationType =
  | "friend_request"
  | "follow"
  | "comment"
  | "like"
  | "mention"
  | "chat"
  | "message_request"
  | "incoming_message";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface Session {
  userId: string;
  username: string;
}

export interface AppSettings {
  /** Public = anonymous can read posts/comments */
  visibility: "public" | "members";
  /** Hour (0–23, local server) for daily auto-ingest */
  dailyIngestHour: number;
  lastIngestAt: string | null;
  ingestEnabled: boolean;
  youtubeChannelIds: string[];
  enabledSources: SourcePlatform[];
}

export interface AppState {
  users: User[];
  topics: Topic[];
  posts: Post[];
  comments: Comment[];
  friendships: Friendship[];
  follows: Follow[];
  chats: ChatThread[];
  messages: ChatMessage[];
  notifications: NotificationItem[];
  currentUserId: string | null;
  settings: AppSettings;
}
