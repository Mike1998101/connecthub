"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("you");
  const [user, setUser] = useState<{ displayName: string; username: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setUser(d.user || null));
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", username }),
    });
    const d = await res.json();
    setUser(d.user);
    setMessage(`Signed in as ${d.user.displayName}`);
    router.refresh();
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

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 sm:px-0">
      <section>
        <h1 className="page-title">Login</h1>
        <p className="page-sub">
          Demo auth — try usernames <code>you</code>, <code>maya_waves</code>, or{" "}
          <code>nova_beats</code>.
        </p>
      </section>
      <form onSubmit={login} className="card space-y-3 p-5">
        <label className="block text-sm font-medium">
          Username
          <input
            className="field mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
        {user ? (
          <button type="button" className="btn-secondary w-full" onClick={logout}>
            Sign out ({user.displayName})
          </button>
        ) : null}
        {message ? <p className="text-sm text-sky-700">{message}</p> : null}
      </form>
    </div>
  );
}
