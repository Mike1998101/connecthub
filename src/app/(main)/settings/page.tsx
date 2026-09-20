"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  visibility: "public" | "members";
  dailyIngestHour: number;
  lastIngestAt: string | null;
  ingestEnabled: boolean;
  youtubeChannelIds: string[];
  enabledSources: string[];
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({});
  const [channels, setChannels] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await fetch("/api/settings").then((r) => r.json());
    setSettings(d.settings);
    setGroups(d.groups || []);
    setByPlatform(d.byPlatform || {});
    setChannels((d.settings?.youtubeChannelIds || []).join("\n"));
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: settings.visibility,
          dailyIngestHour: settings.dailyIngestHour,
          ingestEnabled: settings.ingestEnabled,
          youtubeChannelIds: channels
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean),
          enabledSources: settings.enabledSources,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNote(d.error || "Save failed");
        return;
      }
      setSettings(d.settings);
      setNote("Settings saved — app visibility and daily ingest hour updated.");
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setNote("Running multi-source ingest…");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now", youtubeLimit: 4, rssLimit: 5 }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNote(d.error || "Ingest failed");
        return;
      }
      setNote(
        `Imported ${d.totalImported} items. Groups: ${(d.groups || []).join(", ") || "none"}`
      );
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!settings) {
    return <p className="px-4 text-sm text-slate-500">Loading settings…</p>;
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">App settings</h1>
        <p className="page-sub">
          Public visibility (anonymous can read posts/comments), daily curation hour, and YouTube
          channel RSS sources. Admin only.
        </p>
      </section>

      <div className="card space-y-4 p-5">
        <label className="block text-sm font-medium">
          Visibility
          <select
            className="field mt-1"
            value={settings.visibility}
            onChange={(e) =>
              setSettings({
                ...settings,
                visibility: e.target.value as "public" | "members",
              })
            }
          >
            <option value="public">Public — anyone can read feed & comments</option>
            <option value="members">Members only</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={settings.ingestEnabled}
            onChange={(e) => setSettings({ ...settings, ingestEnabled: e.target.checked })}
          />
          Enable daily automatic ingest
        </label>

        <label className="block text-sm font-medium">
          Daily ingest hour (0–23, server local time)
          <input
            type="number"
            min={0}
            max={23}
            className="field mt-1 max-w-[120px]"
            value={settings.dailyIngestHour}
            onChange={(e) =>
              setSettings({ ...settings, dailyIngestHour: Number(e.target.value) })
            }
          />
        </label>

        <label className="block text-sm font-medium">
          YouTube channel IDs (one per line) — public RSS, no API key
          <textarea
            className="field mt-1 min-h-[100px] font-mono text-xs"
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
          />
        </label>

        <p className="text-xs text-slate-500">
          Last ingest:{" "}
          {settings.lastIngestAt
            ? new Date(settings.lastIngestAt).toLocaleString()
            : "Never — run now or wait for the scheduled hour"}
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={save}>
            Save settings
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={runNow}>
            Run daily curation now
          </button>
          <Link href="/" className="btn-ghost text-sm">
            Back to feed
          </Link>
        </div>
        {note ? <p className="text-sm text-sky-800">{note}</p> : null}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold text-[#16324f]">Live source groups</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {groups.map((g) => (
            <Link
              key={g}
              href={`/?group=${encodeURIComponent(g)}`}
              className="rounded-full bg-[#e8f4ef] px-3 py-1 text-xs font-semibold text-[#2f6b5a]"
            >
              {g}
            </Link>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(byPlatform).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-sky-50 px-3 py-2">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="font-semibold text-[#16324f]">{v} posts</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
