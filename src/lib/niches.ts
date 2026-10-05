import type { SourcePlatform } from "./types";

/** Niche topics curated into ConnectHub (slug → topic id used in DB) */
export const NICHE_TOPICS = [
  { id: "t1", slug: "music", name: "Music", color: "#5B8DEF", description: "Artist drops and listening rooms." },
  { id: "t2", slug: "shorts", name: "Shorts", color: "#3D9B8F", description: "Vertical clips kept in-app." },
  { id: "t3", slug: "community", name: "Community", color: "#E8A87C", description: "Warm board chats." },
  { id: "t4", slug: "creators", name: "Creators", color: "#7B6CF6", description: "Creator behind-the-scenes." },
  { id: "t5", slug: "wellness", name: "Wellness", color: "#6BBF8A", description: "Feel-good habits." },
  { id: "t6", slug: "tech", name: "Tech", color: "#4A90A4", description: "Tools, startups, and engineering." },
  { id: "t7", slug: "science", name: "Science", color: "#2A9D8F", description: "Research, space, and discoveries." },
  { id: "t8", slug: "sports", name: "Sports", color: "#E76F51", description: "Games, highlights, and analysis." },
  { id: "t9", slug: "entertainment", name: "Entertainment", color: "#F4A261", description: "TV, celebs, and pop culture." },
  { id: "t10", slug: "business", name: "Business", color: "#264653", description: "Markets, startups, and leadership." },
  { id: "t11", slug: "lifestyle", name: "Lifestyle", color: "#9B5DE5", description: "Home, style, and daily living." },
  { id: "t12", slug: "food", name: "Food", color: "#F15BB5", description: "Recipes, restaurants, and cooking." },
  { id: "t13", slug: "travel", name: "Travel", color: "#00BBF9", description: "Destinations and journeys." },
  { id: "t14", slug: "health", name: "Health", color: "#00F5D4", description: "Fitness and medical news." },
  { id: "t15", slug: "finance", name: "Finance", color: "#FEE440", description: "Money, investing, and fintech." },
  { id: "t16", slug: "movies", name: "Movies", color: "#9B2226", description: "Film trailers and reviews." },
  { id: "t17", slug: "dev", name: "Dev", color: "#0077B6", description: "Coding tutorials and OSS." },
  { id: "t18", slug: "design", name: "Design", color: "#E63946", description: "UI, product, and visual craft." },
] as const;

export type NicheRss = {
  platform: SourcePlatform;
  url: string;
  topicId: string;
  group: string;
  kind: "article" | "news" | "video";
  tags: string[];
};

/** Public RSS / Atom feeds across niches — no API keys */
export const NICHE_RSS: NicheRss[] = [
  // Tech / Dev
  { platform: "techcrunch", url: "https://techcrunch.com/feed/", topicId: "t6", group: "Tech & Business Media", kind: "article", tags: ["tech", "startups"] },
  { platform: "theverge", url: "https://www.theverge.com/rss/index.xml", topicId: "t6", group: "Tech & Business Media", kind: "news", tags: ["tech", "gadgets"] },
  { platform: "wired", url: "https://www.wired.com/feed/rss", topicId: "t7", group: "Science & Tech Features", kind: "article", tags: ["science", "features"] },
  { platform: "gizmodo", url: "https://gizmodo.com/rss", topicId: "t6", group: "Tech & Business Media", kind: "news", tags: ["gadgets"] },
  { platform: "devto", url: "https://dev.to/feed", topicId: "t17", group: "Developer Hubs", kind: "article", tags: ["dev", "webdev"] },
  { platform: "devto", url: "https://dev.to/feed/tag/design", topicId: "t18", group: "Design", kind: "article", tags: ["design", "ui"] },
  { platform: "css_tricks", url: "https://css-tricks.com/feed/", topicId: "t18", group: "Design", kind: "article", tags: ["design", "css"] },
  { platform: "smashing", url: "https://www.smashingmagazine.com/feed/", topicId: "t18", group: "Design", kind: "article", tags: ["design", "ux"] },
  // Science
  { platform: "nasa", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", topicId: "t7", group: "Science", kind: "news", tags: ["science", "space"] },
  { platform: "sciencedaily", url: "https://www.sciencedaily.com/rss/all.xml", topicId: "t7", group: "Science", kind: "article", tags: ["science", "research"] },
  { platform: "nature", url: "https://www.nature.com/nature.rss", topicId: "t7", group: "Science", kind: "article", tags: ["science", "nature"] },
  // Sports
  { platform: "espn", url: "https://www.espn.com/espn/rss/news", topicId: "t8", group: "Sports", kind: "news", tags: ["sports"] },
  { platform: "bbc_sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", topicId: "t8", group: "Sports", kind: "news", tags: ["sports"] },
  // Entertainment / Movies
  { platform: "variety", url: "https://variety.com/feed/", topicId: "t9", group: "Entertainment", kind: "news", tags: ["entertainment"] },
  { platform: "hollywood", url: "https://deadline.com/feed/", topicId: "t9", group: "Entertainment", kind: "news", tags: ["entertainment", "movies"] },
  { platform: "indiewire", url: "https://www.indiewire.com/feed/", topicId: "t16", group: "Movies", kind: "article", tags: ["movies", "film"] },
  // Business / Finance
  { platform: "cnbc", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", topicId: "t10", group: "Business", kind: "news", tags: ["business"] },
  { platform: "bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss", topicId: "t15", group: "Finance", kind: "news", tags: ["finance", "markets"] },
  { platform: "forbes", url: "https://www.forbes.com/innovation/feed/", topicId: "t10", group: "Business", kind: "article", tags: ["business", "innovation"] },
  // Lifestyle / Food / Travel / Health
  { platform: "lifehacker", url: "https://lifehacker.com/rss", topicId: "t11", group: "Lifestyle", kind: "article", tags: ["lifestyle"] },
  { platform: "bonappetit", url: "https://www.bonappetit.com/feed/rss", topicId: "t12", group: "Food", kind: "article", tags: ["food", "recipes"] },
  { platform: "lonelyplanet", url: "https://www.lonelyplanet.com/news/feed/rss.xml", topicId: "t13", group: "Travel", kind: "news", tags: ["travel"] },
  { platform: "healthline", url: "https://www.healthline.com/rss/health-news", topicId: "t14", group: "Health", kind: "news", tags: ["health"] },
  // Music / Design video-friendly YouTube channels curated via RSS in channels.ts
];

/** YouTube channel IDs tagged by niche for Shorts/video categorization */
export const NICHE_YT_CHANNELS: Array<{ id: string; label: string; topicId: string; niche: string }> = [
  { id: "UCZYTClx2T1of7BRZ86-8fow", label: "SciShow", topicId: "t7", niche: "science" },
  { id: "UC6nSFpj9HTCZ5t-N3Rm3-HA", label: "Vsauce", topicId: "t7", niche: "science" },
  { id: "UCRijo3ddMTht_IHyNSNXpNQ", label: "Dude Perfect", topicId: "t8", niche: "sports" },
  { id: "UCX6OQ3DkcsbYNE6H8uQQuVA", label: "MrBeast", topicId: "t9", niche: "entertainment" },
  { id: "UC9PfnnWTZBAGiGIqs5Oi_0A", label: "Veritasium", topicId: "t7", niche: "science" },
  { id: "UCvjgXvBlbQiydffZU7m1_aw", label: "The Coding Train", topicId: "t17", niche: "dev" },
  { id: "UCJ5v_MCY6GNUBTO8-D3XoAg", label: "Yes Theory", topicId: "t13", niche: "travel" },
  { id: "UCsBjURrPoezykLs9EqgamOA", label: "Fireship", topicId: "t17", niche: "dev" },
  { id: "UCJ0vbdZcyRd3kY38GPehQZQ", label: "DesignCourse", topicId: "t18", niche: "design" },
  { id: "UCJZv4d5rbIKd4QHMPkcABCw", label: "Kevin Powell", topicId: "t18", niche: "design" },
];
