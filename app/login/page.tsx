"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { createAuthBrowserClient, isBrowserAuthConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isReady = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  const sendLink = async () => {
    if (!isReady) return;
    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      if (!isBrowserAuthConfigured()) {
        throw new Error("Supabase Auth is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      }

      const supabase = createAuthBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });

      if (signInError) throw signInError;
      setStatus("Magic link sent. Open it from this browser to enter the workspace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send magic link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1">
      <header className="border-b border-edge bg-bg/85">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="text-sm text-dim transition hover:text-ink">Back</Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="max-w-lg rounded-xl border border-edge bg-panel p-6">
          <p className="text-xs text-faint">Secure workspace access</p>
          <h1 className="mt-4 text-3xl font-semibold">Sign in to QuantPilot.</h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            QuantPilot uses Supabase magic links so saved strategies, reports, and
            automation blueprints belong to the signed-in user, not a browser field.
          </p>

          <label className="mt-6 block">
            <span className="text-xs text-faint">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendLink();
              }}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border border-edge-bright bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/60"
            />
          </label>

          <button
            onClick={sendLink}
            disabled={!isReady || submitting}
            className="mt-5 w-full rounded-md bg-ink py-3 font-medium text-black transition hover:opacity-85 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
          >
            {submitting ? "Sending..." : "Send magic link"}
          </button>

          {status && <p className="mt-4 rounded-md border border-pos/25 bg-pos/5 p-3 text-sm text-pos">{status}</p>}
          {error && <p className="mt-4 rounded-md border border-danger/25 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
        </div>
      </section>
    </main>
  );
}
