"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      setUserEmail(data.session?.user.email ?? null);
      setIsCheckingSession(false);
    }

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user.email ?? null);
        setIsCheckingSession(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
          Steam Sale Watcher
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Track Steam games and get alerted when prices drop.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Search for Steam games, add them to your watchlist, set a target
          price or discount alert, and receive an email when a game matches your
          rule.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Dashboard
          </Link>

          <Link
            href="/deals"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            Browse Deals
          </Link>

          <Link
            href="/free-games"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            Free-to-Keep Games
          </Link>

          {userEmail ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
            >
              Log Out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
            >
              {isCheckingSession ? "Checking..." : "Log In"}
            </Link>
          )}

          <Link
            href="/about"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            About
          </Link>

          <Link
            href="/settings"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            Settings
          </Link>
        </div>

        {userEmail && (
          <p className="mt-5 text-sm text-slate-400">
            Logged in as {userEmail}
          </p>
        )}
      </section>
    </main>
  );
}