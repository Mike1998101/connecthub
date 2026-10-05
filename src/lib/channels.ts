import { NICHE_YT_CHANNELS } from "./niches";

/** Default YouTube channels (public upload RSS — no API key) */
export const DEFAULT_YT_CHANNELS = [
  { id: "UCZYTClx2T1of7BRZ86-8fow", label: "SciShow", topicId: "t7", niche: "science" },
  { id: "UC6nSFpj9HTCZ5t-N3Rm3-HA", label: "Vsauce", topicId: "t7", niche: "science" },
  { id: "UC9PfnnWTZBAGiGIqs5Oi_0A", label: "Veritasium", topicId: "t7", niche: "science" },
  { id: "UCRijo3ddMTht_IHyNSNXpNQ", label: "Dude Perfect", topicId: "t8", niche: "sports" },
  { id: "UCX6OQ3DkcsbYNE6H8uQQuVA", label: "MrBeast", topicId: "t9", niche: "entertainment" },
  { id: "UCvjgXvBlbQiydffZU7m1_aw", label: "The Coding Train", topicId: "t17", niche: "dev" },
  { id: "UCsBjURrPoezykLs9EqgamOA", label: "Fireship", topicId: "t17", niche: "dev" },
  { id: "UCJ5v_MCY6GNUBTO8-D3XoAg", label: "Yes Theory", topicId: "t13", niche: "travel" },
  { id: "UCJ0vbdZcyRd3kY38GPehQZQ", label: "DesignCourse", topicId: "t18", niche: "design" },
  { id: "UCJZv4d5rbIKd4QHMPkcABCw", label: "Kevin Powell", topicId: "t18", niche: "design" },
  // Music / known artists channels
  { id: "UCDGmojow_e85yj8pRqbNWbg", label: "Billie Eilish", topicId: "t1", niche: "music" },
  { id: "UCqECaJ8Gagnn7fO1tW3L65Q", label: "Taylor Swift", topicId: "t1", niche: "music" },
  { id: "UC0WP5P-ufpRfjbNrmOWwLBQ", label: "The Weeknd", topicId: "t1", niche: "music" },
  { id: "UCLwSYXy6mvY1iC8sK_VoYiw", label: "Bad Bunny", topicId: "t1", niche: "music" },
  { id: "UCO5QSoES5yn2Du7ASbgLbcw", label: "SZA", topicId: "t1", niche: "music" },
];

export function channelMeta(channelId: string) {
  return (
    DEFAULT_YT_CHANNELS.find((c) => c.id === channelId) ||
    NICHE_YT_CHANNELS.find((c) => c.id === channelId) || {
      id: channelId,
      label: channelId.slice(0, 12),
      topicId: "t4",
      niche: "creators",
    }
  );
}
