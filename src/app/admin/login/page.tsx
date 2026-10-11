"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }
      const next = searchParams.get("next") || "/admin";
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-ink/20 bg-paper p-8"
      >
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-rust uppercase">
          Admin
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Placeholder auth for local grid editing. Default:{" "}
          <code className="font-mono text-ink">admin</code> /{" "}
          <code className="font-mono text-ink">admin</code>
        </p>

        <label className="mt-8 block text-sm text-ink">
          Username
          <input
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-rust"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mt-4 block text-sm text-ink">
          Password
          <input
            type="password"
            className="mt-1 w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-rust"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 text-sm text-rust" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.16em] text-paper uppercase disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full flex-1 items-center justify-center p-8 text-ink/60">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
