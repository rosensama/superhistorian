"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      const from = searchParams.get("from") || "/";
      router.replace(from.startsWith("/") ? from : "/");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <label className="block">
        <span className="text-sm font-serif text-ink/70">Password</span>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sepia/30 bg-white/80 px-3 py-2 font-serif text-ink outline-none focus:border-sepia"
        />
      </label>
      {error && <p className="text-sm text-crimson font-serif">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-serif text-white hover:bg-navy/80 disabled:opacity-40"
      >
        {loading ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-parchment via-parchment to-amber-50/50 flex flex-col items-center justify-center px-4">
      <h1 className="font-display text-3xl font-bold text-ink mb-2">Super Historian</h1>
      <p className="font-serif text-sm text-ink/60 mb-8">Enter the site password to continue.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
