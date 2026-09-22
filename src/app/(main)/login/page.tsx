"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = { id?: string; displayName: string; username: string };

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("you");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d?.user?.displayName ? d.user : null))
      .catch(() => setUser(null));
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const welcome = params.get("welcome");
    if (err) setMessage(decodeURIComponent(err));
    if (welcome === "google") setMessage("Signed in with Google");
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username }),
      });
      const d = await res.json().catch(() => ({} as { error?: string; user?: AuthUser }));
      if (!res.ok || !d?.user?.displayName) {
        setUser(null);
        setMessage(
          d?.error ||
            (res.status === 404
              ? "Sign-in failed — demo users are missing. Run npm run db:seed."
              : `Sign-in failed (${res.status})`)
        );
        return;
      }
      setUser(d.user);
      setMessage(`Signed in as ${d.user.displayName}`);
      router.refresh();
    } catch {
      setUser(null);
      setMessage("Sign-in failed — could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setMessage("Signed out");
  }

  async function google() {
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "google_url" }),
      });
      const d = await res.json().catch(() => ({} as { error?: string; url?: string }));
      if (d?.url) {
        window.location.href = d.url;
        return;
      }
      setMessage(d?.error || "Google sign-in is not configured in Supabase Auth.");
    } catch {
      setMessage("Google sign-in failed — could not reach the server");
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Login</h1>
        <p className="page-sub">
          Sign in with Google to create an account, or use a demo username:{" "}
          <code>you</code>, <code>maya_waves</code>, or <code>nova_beats</code>.
        </p>
      </section>
      <form onSubmit={login} className="card space-y-3 p-5">
        <button
          type="button"
          className="btn-primary w-full"
          onClick={google}
          disabled={googleBusy}
        >
          {googleBusy ? "Redirecting…" : "Continue with Google"}
        </button>
        <p className="text-center text-xs text-slate-400">or demo username</p>
        <label className="block text-sm font-medium">
          Username
          <input
            className="field mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-secondary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {user?.displayName ? (
          <button type="button" className="btn-secondary w-full" onClick={logout}>
            Sign out ({user.displayName})
          </button>
        ) : null}
        {message ? <p className="text-sm text-sky-700">{message}</p> : null}
      </form>
    </div>
  );
}
