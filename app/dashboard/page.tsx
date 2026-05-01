"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      setUserEmail(data.session?.user.email ?? null);
      setIsCheckingSession(false);
    }

    getSession();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            Back home
          </Link>

          {userEmail && (
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              Log out
            </button>
          )}
        </div>

        <div className="mt-8">
          <p className="text-sm text-slate-400">
            {isCheckingSession
              ? "Checking login status..."
              : userEmail
                ? `Logged in as ${userEmail}`
                : "Not logged in"}
          </p>

          <h1 className="mt-3 text-3xl font-bold">Dashboard</h1>
          <p className="mt-3 text-slate-300">
            Your watched Steam games will appear here.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Watchlist</h2>
          <p className="mt-2 text-slate-400">
            No games are being watched yet.
          </p>
        </div>
      </section>
    </main>
  );
}