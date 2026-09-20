import { getState, mutate } from "./store";
import { runDailyIngest } from "./scrapers";

let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

/**
 * Lightweight in-process scheduler: checks every minute whether local hour
 * matches settings.dailyIngestHour and whether we already ran today.
 */
export function ensureDailyCron() {
  if (started || typeof setInterval === "undefined") return;
  started = true;
  timer = setInterval(() => {
    void tick();
  }, 60_000);
  // Also attempt once on boot if overdue
  void tick();
}

async function tick() {
  const s = getState();
  if (!s.settings.ingestEnabled) return;
  const now = new Date();
  if (now.getHours() !== s.settings.dailyIngestHour) return;
  const last = s.settings.lastIngestAt ? new Date(s.settings.lastIngestAt) : null;
  if (last && sameDay(last, now)) return;
  try {
    await runDailyIngest({ youtubeLimit: 4, rssLimit: 5 });
  } catch {
    // swallow — next minute will not retry same day once lastIngestAt set;
    // only set on success inside runDailyIngest
  }
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function stopDailyCron() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

export function updateIngestSchedule(hour: number, enabled?: boolean) {
  mutate((st) => {
    st.settings.dailyIngestHour = Math.max(0, Math.min(23, Math.floor(hour)));
    if (typeof enabled === "boolean") st.settings.ingestEnabled = enabled;
  });
  return getState().settings;
}
