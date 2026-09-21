import { getSettings, updateSettings } from "./db";
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
  void tick();
}

async function tick() {
  const settings = await getSettings();
  if (!settings.ingestEnabled) return;
  const now = new Date();
  if (now.getHours() !== settings.dailyIngestHour) return;
  const last = settings.lastIngestAt ? new Date(settings.lastIngestAt) : null;
  if (last && sameDay(last, now)) return;
  try {
    await runDailyIngest({ youtubeLimit: 4, rssLimit: 5 });
  } catch {
    // swallow — retry next minute until lastIngestAt is set on success
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

export async function updateIngestSchedule(hour: number, enabled?: boolean) {
  return updateSettings({
    dailyIngestHour: Math.max(0, Math.min(23, Math.floor(hour))),
    ...(typeof enabled === "boolean" ? { ingestEnabled: enabled } : {}),
  });
}
