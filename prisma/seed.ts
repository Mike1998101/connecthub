import { PrismaClient } from "@prisma/client";
import {
  seedUsers,
  seedTopics,
  buildSeedPosts,
  buildSeedComments,
  buildSeedSocial,
  curatedArtists,
  curatedShortIds,
  SERVICE_USER_ID,
} from "../src/lib/store";
import { DEFAULT_YT_CHANNELS } from "../src/lib/channels";

const prisma = new PrismaClient({
  datasources: {
    db: {
      // Session-mode pooler is more stable for long seed runs than transaction pooler
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  retry ${i}/${attempts} ${label}: ${msg.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  throw last;
}

async function main() {
  console.log("Seeding ConnectHub…");
  console.log(`  curated shorts: ${curatedShortIds.length}, artists: ${curatedArtists.length}`);

  await withRetry("clear", async () => {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "chat_messages",
        "chat_members",
        "chat_threads",
        "notifications",
        "follows",
        "friendships",
        "comments",
        "post_topics",
        "posts",
        "topics",
        "users",
        "app_settings"
      RESTART IDENTITY CASCADE
    `);
  });

  for (const u of seedUsers) {
    await withRetry(`user ${u.id}`, () =>
      prisma.user.create({
        data: {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          bio: u.bio,
          avatarUrl: u.avatarUrl,
          profilePublic: u.profilePublic,
          joinedAt: new Date(u.joinedAt),
          location: u.location,
          interests: u.interests,
          followersCount: u.followersCount,
          followingCount: u.followingCount,
          friendsCount: u.friendsCount,
          postsCount: u.postsCount,
          rating: u.rating,
          isAdmin: !!u.isAdmin,
          isService: !!u.isService,
        },
      })
    );
  }

  for (const t of seedTopics) {
    await withRetry(`topic ${t.id}`, () =>
      prisma.topic.create({
        data: {
          id: t.id,
          slug: t.slug,
          name: t.name,
          description: t.description,
          postCount: t.postCount,
          color: t.color,
        },
      })
    );
  }

  const posts = buildSeedPosts();
  for (const p of posts) {
    await withRetry(`post ${p.id}`, () =>
      prisma.post.create({
        data: {
          id: p.id,
          authorId: p.authorId,
          kind: p.kind,
          title: p.title,
          body: p.body,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          upvotes: p.upvotes,
          downvotes: p.downvotes,
          likes: p.likes,
          commentCount: p.commentCount,
          media: p.media ?? undefined,
          imageUrls: p.imageUrls ?? [],
          sourceHidden: p.sourceHidden,
          bookmarkedBy: p.bookmarkedBy,
          likedBy: p.likedBy,
          voters: p.voters,
          fingerprint: p.fingerprint,
          sourcePlatform: p.sourcePlatform,
          clusterId: p.clusterId,
          sourceGroup: p.sourceGroup,
          topics: {
            create: p.topicIds.map((topicId) => ({ topicId })),
          },
        },
      })
    );
  }

  const svcCount = posts.filter((p) => p.authorId === SERVICE_USER_ID).length;
  await withRetry("svc count", () =>
    prisma.user.update({
      where: { id: SERVICE_USER_ID },
      data: { postsCount: svcCount },
    })
  );

  for (const c of buildSeedComments()) {
    await withRetry(`comment ${c.id}`, () =>
      prisma.comment.create({
        data: {
          id: c.id,
          postId: c.postId,
          authorId: c.authorId,
          parentId: c.parentId,
          body: c.body,
          createdAt: new Date(c.createdAt),
          upvotes: c.upvotes,
          downvotes: c.downvotes,
        },
      })
    );
  }

  const social = buildSeedSocial();
  for (const f of social.friendships) {
    await withRetry(`friend ${f.id}`, () =>
      prisma.friendship.create({
        data: {
          id: f.id,
          userId: f.userId,
          friendId: f.friendId,
          status: f.status,
          createdAt: new Date(f.createdAt),
        },
      })
    );
  }
  for (const f of social.follows) {
    await withRetry(`follow ${f.followerId}->${f.followingId}`, () =>
      prisma.follow.create({
        data: {
          followerId: f.followerId,
          followingId: f.followingId,
          createdAt: new Date(f.createdAt),
        },
      })
    );
  }
  for (const ch of social.chats) {
    await withRetry(`chat ${ch.id}`, () =>
      prisma.chatThread.create({
        data: {
          id: ch.id,
          type: ch.type,
          title: ch.title,
          lastMessageAt: new Date(ch.lastMessageAt),
          lastPreview: ch.lastPreview,
          status: ch.status,
          requestedById: ch.requestedBy,
          members: {
            create: ch.memberIds.map((userId) => ({ userId })),
          },
        },
      })
    );
  }
  for (const m of social.messages) {
    await withRetry(`msg ${m.id}`, () =>
      prisma.chatMessage.create({
        data: {
          id: m.id,
          threadId: m.threadId,
          senderId: m.senderId,
          body: m.body,
          createdAt: new Date(m.createdAt),
        },
      })
    );
  }
  for (const n of social.notifications) {
    await withRetry(`notif ${n.id}`, () =>
      prisma.notificationItem.create({
        data: {
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          href: n.href,
          read: n.read,
          createdAt: new Date(n.createdAt),
        },
      })
    );
  }

  await withRetry("settings", () =>
    prisma.appSettings.create({
      data: {
        id: 1,
        visibility: "public",
        dailyIngestHour: 8,
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
        currentUserId: null,
      },
    })
  );

  console.log(`Seeded ${seedUsers.length} users, ${posts.length} posts, ${seedTopics.length} topics`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
