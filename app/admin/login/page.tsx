"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLock, FiMail, FiAlertTriangle } from "react-icons/fi";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-paper">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="folio mb-3">Restricted access</div>
          <h1 className="display text-5xl sm:text-6xl">
            Admin <span className="display-italic text-accent">console.</span>
          </h1>
          <p className="serif text-ink-2 mt-4">
            Sign in with your administrator credentials.
          </p>
        </div>

        <form onSubmit={onSubmit} className="sheet p-8 flex flex-col gap-5">
          <label className="block">
            <span className="eyebrow-sm">Email</span>
            <div className="relative mt-2">
              <FiMail
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="field w-full"
                style={{ paddingLeft: "40px" }}
                placeholder="admin@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="eyebrow-sm">Password</span>
            <div className="relative mt-2">
              <FiLock
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="field w-full"
                style={{ paddingLeft: "40px" }}
                placeholder="••••••••"
              />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-oxblood text-sm">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-ink w-full mt-2"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="folio text-ink-3 text-center mt-2">
            Sessions expire after 12 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
