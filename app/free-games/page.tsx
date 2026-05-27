"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import CheckCountdown from "@/components/CheckCountdown";
import { supabase } from "@/lib/supabaseClient";

type FreeGame = {
  id: string;
  source: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_confirmed_free_at: string | null;
  games: {
    id: string;
    steam_app_id: number;
    name: string;
    header_image: string | null;
    store_url: string | null;
    current_price: number | null;
    original_price: number | null;
    discount_percent: number | null;
    currency: string | null;
    last_checked_at: string | null;
  } | null;
};

export default function FreeGamesPage() {
  const [freeGames, setFreeGames] = useState<FreeGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayTimeZone, setDisplayTimeZone] = useState("auto");

  useEffect(() => {
    async function loadFreeGames() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/free-games", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load free games");
        }

        setFreeGames(data.freeGames ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load free games"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadFreeGames();
  }, []);

  useEffect(() => {
    async function loadDisplayTimeZone() {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;

        if (!userId) {
        return;
        }

        const response = await fetch(`/api/settings?userId=${userId}`);
        const result = await response.json();

        if (response.ok && result.settings?.display_time_zone) {
        setDisplayTimeZone(result.settings.display_time_zone);
        }
    }

    loadDisplayTimeZone();
    }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <AppNav />

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Free-to-keep games
          </p>

          <h1 className="mt-3 text-4xl font-bold">Free to Keep</h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Browse normally paid Steam games that Steam Sale Watcher detected as
            temporarily free to keep. These results come from curated deal
            sources and are verified with Steam before being shown.
          </p>

          <p className="mt-3 max-w-3xl text-sm text-slate-400">
            This page does not scan the full Steam catalog, so some promotions
            may be missed. Always check the Steam page before assuming a deal is
            still active.
          </p>

          <div className="mt-5 max-w-xl">
            <CheckCountdown type="daily-free-games" displayTimeZone={displayTimeZone} />
          </div>
        </div>

        {isLoading && (
          <p className="mt-8 text-sm text-slate-400">Loading free games...</p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && freeGames.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              No free-to-keep games found right now
            </h2>
            <p className="mt-2 text-slate-400">
              Steam Sale Watcher checks curated deal sources and verifies
              candidates with Steam. Check back after the next scheduled scan.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {freeGames.map((freeGame) => {
            const game = freeGame.games;

            if (!game) {
              return null;
            }

            return (
              <div
                key={freeGame.id}
                className="overflow-hidden rounded-2xl border border-green-900 bg-slate-900 shadow-lg shadow-green-950/20"
              >
                <Image
                  src={
                    game.header_image ??
                    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.steam_app_id}/header.jpg`
                  }
                  alt={`${game.name} header image`}
                  width={460}
                  height={215}
                  className="h-40 w-full object-cover"
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{game.name}</h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Source:{" "}
                        {freeGame.source === "isthereanydeal"
                          ? "IsThereAnyDeal"
                          : freeGame.source}
                      </p>
                    </div>

                    <span className="rounded-full border border-green-700 bg-green-950 px-3 py-1 text-xs font-semibold text-green-200">
                      Free to keep
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-300">
                    <p>Current price: Free</p>

                    <p>
                      Original price:{" "}
                      {game.original_price === null
                        ? "Normally paid"
                        : `$${Number(game.original_price).toFixed(2)}`}
                    </p>

                    <p>
                      Discount:{" "}
                      {game.discount_percent === null
                        ? "100%"
                        : `${game.discount_percent}%`}
                    </p>

                    <p>
                      Last confirmed free:{" "}
                      {freeGame.last_confirmed_free_at
                        ? new Date(
                            freeGame.last_confirmed_free_at
                          ).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {game.store_url && (
                      <a
                        href={game.store_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-800"
                      >
                        View on Steam
                      </a>
                    )}

                    <Link
                      href={`/games/${game.id}`}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-800"
                    >
                      Price history
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}