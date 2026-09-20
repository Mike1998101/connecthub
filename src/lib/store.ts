import type {
  AppState,
  Comment,
  Post,
  Topic,
  User,
  Friendship,
  Follow,
  ChatThread,
  ChatMessage,
  NotificationItem,
} from "./types";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

export const seedUsers: User[] = [
  {
    id: "u1",
    username: "maya_waves",
    displayName: "Maya Waves",
    bio: "Short-form storyteller · music nights · community host",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maya",
    profilePublic: true,
    joinedAt: daysAgo(420),
    location: "Lisbon",
    interests: ["music", "shorts", "travel"],
    followersCount: 12840,
    followingCount: 312,
    friendsCount: 86,
    postsCount: 214,
    rating: 4.9,
  },
  {
    id: "u2",
    username: "jordan_ink",
    displayName: "Jordan Ink",
    bio: "Illustrator sharing process clips and warm community tips",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jordan",
    profilePublic: true,
    joinedAt: daysAgo(210),
    location: "Toronto",
    interests: ["art", "design", "community"],
    followersCount: 6420,
    followingCount: 188,
    friendsCount: 54,
    postsCount: 97,
    rating: 4.7,
  },
  {
    id: "u3",
    username: "nova_beats",
    displayName: "Nova Beats",
    bio: "Curating feel-good tracks from artists you already love",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Nova",
    profilePublic: true,
    joinedAt: daysAgo(90),
    location: "Seoul",
    interests: ["music", "producers", "live"],
    followersCount: 22100,
    followingCount: 401,
    friendsCount: 120,
    postsCount: 310,
    rating: 4.95,
  },
  {
    id: "u4",
    username: "sam_quiet",
    displayName: "Sam Quiet",
    bio: "Private by default — friends only for deep dives",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sam",
    profilePublic: false,
    joinedAt: daysAgo(60),
    location: "Austin",
    interests: ["books", "film"],
    followersCount: 890,
    followingCount: 120,
    friendsCount: 18,
    postsCount: 22,
    rating: 4.2,
  },
  {
    id: "u5",
    username: "you",
    displayName: "You",
    bio: "Welcome to ConnectHub — update your bio anytime",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=You",
    profilePublic: true,
    joinedAt: daysAgo(2),
    location: "Anywhere",
    interests: ["community", "music", "shorts"],
    followersCount: 12,
    followingCount: 8,
    friendsCount: 3,
    postsCount: 2,
    rating: 4.0,
  },
];

export const seedTopics: Topic[] = [
  {
    id: "t1",
    slug: "music",
    name: "Music",
    description: "Artist drops, playlists, and listening rooms kept on-platform.",
    postCount: 48,
    color: "#5B8DEF",
  },
  {
    id: "t2",
    slug: "shorts",
    name: "Shorts",
    description: "Vertical clips ingested for in-app viewing — no outbound hops.",
    postCount: 62,
    color: "#3D9B8F",
  },
  {
    id: "t3",
    slug: "community",
    name: "Community",
    description: "Warm board chats, introductions, and local meetups.",
    postCount: 35,
    color: "#E8A87C",
  },
  {
    id: "t4",
    slug: "creators",
    name: "Creators",
    description: "Behind-the-scenes from popular ConnectHub voices.",
    postCount: 28,
    color: "#7B6CF6",
  },
  {
    id: "t5",
    slug: "wellness",
    name: "Wellness",
    description: "Gentle check-ins, walks, and feel-good habits.",
    postCount: 19,
    color: "#6BBF8A",
  },
  {
    id: "t6",
    slug: "tech",
    name: "Tech",
    description: "Tools, tips, and demos without link sprawl.",
    postCount: 24,
    color: "#4A90A4",
  },
];

/** Popular short-form video ids used when live YouTube API key is absent */
export const curatedShortIds = [
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny moments", channel: "Blender Foundation", tags: ["shorts", "animation"] },
  { id: "LXb3EKWsInQ", title: "Coastal calm reel", channel: "Nature Desk", tags: ["shorts", "travel"] },
  { id: "ScMzIvxBSi4", title: "Studio session snippet", channel: "Studio Loop", tags: ["shorts", "music"] },
  { id: "dQw4w9WgXcQ", title: "Classic stage energy", channel: "Archive Live", tags: ["shorts", "music"] },
  { id: "jNQXAC9IVRw", title: "First camera laughs", channel: "Museum Clips", tags: ["shorts", "community"] },
];

export const curatedArtists = [
  {
    artist: "Billie Eilish",
    track: "Birds of a Feather",
    album: "Hit Me Hard and Soft",
    genre: "Pop",
    youtubeVideoId: "V9PVRfjEBTI",
    description:
      "Soft-edged pop with intimate vocal layering — streamed in-app so the conversation stays on ConnectHub.",
  },
  {
    artist: "Taylor Swift",
    track: "Cruel Summer",
    album: "Lover",
    genre: "Pop",
    youtubeVideoId: "ic8j13piAhQ",
    description:
      "Summer-bright hooks and crowd energy. Details enriched from artist catalog metadata.",
  },
  {
    artist: "The Weeknd",
    track: "Blinding Lights",
    album: "After Hours",
    genre: "Synth-pop",
    youtubeVideoId: "4NRXx6U8ABQ",
    description:
      "Neon synth pulse and 80s nostalgia — playable inside the card, no external redirect.",
  },
  {
    artist: "Bad Bunny",
    track: "DtMF",
    album: "Nadie Sabe Lo Que Va a Pasar Mañana",
    genre: "Reggaeton",
    youtubeVideoId: "saGYMhApaP8",
    description:
      "Island rhythm and bilingual wordplay. Music feed curated for community listening.",
  },
  {
    artist: "SZA",
    track: "Snooze",
    album: "SOS",
    genre: "R&B",
    youtubeVideoId: "UowPNx9bOGI",
    description:
      "Velvet R&B ballad energy — comments and reactions stay nested under the post.",
  },
];

export function buildSeedPosts(): Post[] {
  const shorts = curatedShortIds.map((s, i) => ({
    id: `ps${i + 1}`,
    authorId: i % 2 === 0 ? "u1" : "u3",
    kind: "short" as const,
    title: s.title,
    body: `${s.title} — full description pulled for in-app viewing. Channel: ${s.channel}. Tags: ${s.tags.join(", ")}. Stay and chat; outbound platform marks are hidden.`,
    topicIds: ["t2", s.tags.includes("music") ? "t1" : "t3"],
    createdAt: hoursAgo(2 + i * 5),
    updatedAt: hoursAgo(2 + i * 5),
    upvotes: 120 + i * 37,
    downvotes: 2 + (i % 3),
    likes: 80 + i * 21,
    commentCount: 4 + i,
    media: {
      title: s.title,
      description: `Auto-ingested short with enriched metadata: channel “${s.channel}”, tags [${s.tags.join(", ")}], vertical framing optimized for full-bleed mobile width.`,
      channelTitle: s.channel,
      youtubeVideoId: s.id,
      durationSec: 45 + i * 8,
      publishedAt: daysAgo(1 + i),
      viewCount: 50000 + i * 12000,
      likeCount: 3200 + i * 400,
      tags: s.tags,
      thumbnailUrl: `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`,
      width: 1080,
      height: 1920,
    },
    sourceHidden: true,
    bookmarkedBy: i === 0 ? ["u5"] : [],
    likedBy: ["u5"],
    voters: { u5: 1 as const },
  }));

  const music = curatedArtists.map((a, i) => ({
    id: `pm${i + 1}`,
    authorId: "u3",
    kind: "music" as const,
    title: `${a.artist} — ${a.track}`,
    body: a.description,
    topicIds: ["t1"],
    createdAt: hoursAgo(1 + i * 3),
    updatedAt: hoursAgo(1 + i * 3),
    upvotes: 200 + i * 55,
    downvotes: 1,
    likes: 150 + i * 40,
    commentCount: 6 + i,
    media: {
      title: a.track,
      artist: a.artist,
      album: a.album,
      genre: a.genre,
      description: a.description,
      youtubeVideoId: a.youtubeVideoId,
      durationSec: 180 + i * 12,
      tags: ["music", a.genre.toLowerCase(), a.artist.toLowerCase().replace(/\s+/g, "-")],
      thumbnailUrl: `https://i.ytimg.com/vi/${a.youtubeVideoId}/hqdefault.jpg`,
      channelTitle: a.artist,
      publishedAt: daysAgo(30 + i * 10),
      viewCount: 1_000_000 + i * 250_000,
      likeCount: 40_000 + i * 5_000,
    },
    sourceHidden: true,
    bookmarkedBy: i < 2 ? ["u5"] : [],
    likedBy: i % 2 === 0 ? ["u5"] : [],
    voters: {},
  }));

  const community: Post[] = [
    {
      id: "pc1",
      authorId: "u2",
      kind: "image",
      title: "Warm board sketch of the week",
      body: "Soft pencil pass of our Friendly Cards layout moodboard. Drop nested feedback below — keep everything here so newcomers can follow along.",
      topicIds: ["t3", "t4"],
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
      upvotes: 89,
      downvotes: 0,
      likes: 64,
      commentCount: 3,
      imageUrls: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
      ],
      media: {
        title: "Moodboard sketch",
        description: "Wide hero image for full-bleed phone layouts",
        width: 1600,
        height: 1000,
        tags: ["community", "design"],
      },
      sourceHidden: true,
      bookmarkedBy: [],
      likedBy: [],
      voters: {},
    },
    {
      id: "pc2",
      authorId: "u5",
      kind: "text",
      title: "Hello ConnectHub",
      body: "First post from my profile — looking for music friends and short-form collaborators. Say hi in the thread!",
      topicIds: ["t3"],
      createdAt: hoursAgo(10),
      updatedAt: hoursAgo(10),
      upvotes: 24,
      downvotes: 0,
      likes: 18,
      commentCount: 2,
      sourceHidden: true,
      bookmarkedBy: [],
      likedBy: [],
      voters: {},
    },
  ];

  return [...music, ...shorts, ...community];
}

export function buildSeedComments(): Comment[] {
  return [
    {
      id: "c1",
      postId: "pm1",
      authorId: "u1",
      parentId: null,
      body: "This track hits differently in the evening feed.",
      createdAt: hoursAgo(0.5),
      upvotes: 12,
      downvotes: 0,
    },
    {
      id: "c2",
      postId: "pm1",
      authorId: "u5",
      parentId: "c1",
      body: "Agreed — love that we can discuss without leaving the page.",
      createdAt: hoursAgo(0.3),
      upvotes: 5,
      downvotes: 0,
    },
    {
      id: "c3",
      postId: "ps1",
      authorId: "u2",
      parentId: null,
      body: "Full-bleed short looks great on phone width.",
      createdAt: hoursAgo(1),
      upvotes: 8,
      downvotes: 0,
    },
    {
      id: "c4",
      postId: "pc2",
      authorId: "u3",
      parentId: null,
      body: "Welcome! Check Topics → Music for today’s artist feed.",
      createdAt: hoursAgo(8),
      upvotes: 3,
      downvotes: 0,
    },
  ];
}

export function buildSeedSocial() {
  const friendships: Friendship[] = [
    {
      id: "f1",
      userId: "u5",
      friendId: "u1",
      status: "accepted",
      createdAt: daysAgo(1),
    },
    {
      id: "f2",
      userId: "u5",
      friendId: "u3",
      status: "accepted",
      createdAt: daysAgo(1),
    },
    {
      id: "f3",
      userId: "u2",
      friendId: "u5",
      status: "pending",
      createdAt: hoursAgo(4),
    },
  ];
  const follows: Follow[] = [
    { followerId: "u5", followingId: "u1", createdAt: daysAgo(1) },
    { followerId: "u5", followingId: "u3", createdAt: daysAgo(1) },
    { followerId: "u1", followingId: "u5", createdAt: hoursAgo(20) },
    { followerId: "u2", followingId: "u3", createdAt: daysAgo(3) },
  ];
  const chats: ChatThread[] = [
    {
      id: "ch1",
      type: "peer",
      title: "Maya Waves",
      memberIds: ["u5", "u1"],
      lastMessageAt: hoursAgo(1),
      lastPreview: "Want to co-host a listening room?",
    },
    {
      id: "ch2",
      type: "group",
      title: "Friday Music Circle",
      memberIds: ["u5", "u1", "u3", "u2"],
      lastMessageAt: hoursAgo(3),
      lastPreview: "Nova dropped three new artist cards",
    },
  ];
  const messages: ChatMessage[] = [
    {
      id: "m1",
      threadId: "ch1",
      senderId: "u1",
      body: "Want to co-host a listening room?",
      createdAt: hoursAgo(1),
    },
    {
      id: "m2",
      threadId: "ch1",
      senderId: "u5",
      body: "Yes — keep it on ConnectHub so folks stay in chat.",
      createdAt: hoursAgo(0.8),
    },
    {
      id: "m3",
      threadId: "ch2",
      senderId: "u3",
      body: "Nova dropped three new artist cards",
      createdAt: hoursAgo(3),
    },
  ];
  const notifications: NotificationItem[] = [
    {
      id: "n1",
      userId: "u5",
      type: "friend_request",
      title: "Friend request",
      body: "Jordan Ink wants to connect",
      href: "/friends",
      read: false,
      createdAt: hoursAgo(4),
    },
    {
      id: "n2",
      userId: "u5",
      type: "comment",
      title: "New comment",
      body: "Maya replied in Birds of a Feather",
      href: "/?focus=pm1",
      read: false,
      createdAt: hoursAgo(0.4),
    },
    {
      id: "n3",
      userId: "u5",
      type: "follow",
      title: "New follower",
      body: "Maya Waves started following you",
      href: "/users/u1",
      read: true,
      createdAt: hoursAgo(20),
    },
  ];
  return { friendships, follows, chats, messages, notifications };
}

let state: AppState | null = null;

export function getState(): AppState {
  if (!state) {
    const social = buildSeedSocial();
    state = {
      users: seedUsers,
      topics: seedTopics,
      posts: buildSeedPosts(),
      comments: buildSeedComments(),
      ...social,
      currentUserId: "u5",
    };
  }
  return state;
}

export function setState(next: AppState) {
  state = next;
}

export function mutate(fn: (s: AppState) => void) {
  const s = getState();
  fn(s);
  setState(s);
  return s;
}

export function getUser(id: string) {
  return getState().users.find((u) => u.id === id);
}

export function nestComments(postId: string): Comment[] {
  const all = getState().comments.filter((c) => c.postId === postId);
  const byParent = new Map<string | null, Comment[]>();
  for (const c of all) {
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

export function stripExternalUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[link removed — stay on ConnectHub]")
    .replace(/www\.\S+/gi, "[link removed — stay on ConnectHub]")
    .replace(/youtu\.be\/\S+/gi, "")
    .replace(/youtube\.com\/\S+/gi, "");
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
