"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type SteamSearchResult = {
  steamAppId: number;
  name: string;
  image: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  currency: string;
};

type WatchlistItem = {
  id: string;
  target_price: number;
  alert_enabled: boolean;
  alert_triggered: boolean;
  games: {
    steam_app_id: number;
    name: string;
    store_url: string | null;
    current_price: number | null;
    discount_percent: number | null;
    currency: string | null;
    is_free: boolean | null;
    last_checked_at: string | null;
  };
};

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SteamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [targetPrices, setTargetPrices] = useState<Record<number, string>>({});
  const [addStatusMessage, setAddStatusMessage] = useState("");
  const [addErrorMessage, setAddErrorMessage] = useState("");
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  const [watchlistError, setWatchlistError] = useState("");
  const [editTargetPrices, setEditTargetPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      setUserEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
      if (data.session?.user.id) {
        loadWatchlist(data.session.user.id);
      }
      setIsCheckingSession(false);
    }

    getSession();
  }, []);

  async function loadWatchlist(currentUserId: string) {
    setIsLoadingWatchlist(true);
    setWatchlistError("");

    try {
      const response = await fetch(`/api/watchlist?userId=${currentUserId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load watchlist");
      }

      setWatchlistItems(data.watchlistItems ?? []);
    } catch (error) {
      setWatchlistError(
        error instanceof Error ? error.message : "Unable to load watchlist"
      );
    } finally {
      setIsLoadingWatchlist(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `/api/steam/search?q=${encodeURIComponent(trimmedQuery)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to search games");
      }

      setSearchResults(data.results ?? []);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unable to search games"
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddToWatchlist(game: SteamSearchResult) {
    setAddStatusMessage("");
    setAddErrorMessage("");

    if (!userId) {
      setAddErrorMessage("Please log in before adding games to your watchlist.");
      return;
    }

    const targetPriceValue = Number(targetPrices[game.steamAppId]);

    if (Number.isNaN(targetPriceValue) || targetPriceValue < 0) {
      setAddErrorMessage("Please enter a valid target price.");
      return;
    }

    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          steamAppId: game.steamAppId,
          name: game.name,
          targetPrice: targetPriceValue,
          currentPrice: game.currentPrice,
          originalPrice: game.originalPrice,
          currency: game.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add game to watchlist");
      }

      setAddStatusMessage(`${game.name} was added to your watchlist.`);
      loadWatchlist(userId);
      setTargetPrices((current) => ({
        ...current,
        [game.steamAppId]: "",
      }));
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Unable to add game to watchlist"
      );
    }
  }

  async function handleRemoveFromWatchlist(itemId: string) {
    setAddStatusMessage("");
    setAddErrorMessage("");

    if (!userId) {
      setAddErrorMessage("Please log in before removing games from your watchlist.");
      return;
    }

    try {
      const response = await fetch(
        `/api/watchlist?itemId=${itemId}&userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove game from watchlist");
      }

      setAddStatusMessage("Game removed from your watchlist.");
      loadWatchlist(userId);
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to remove game from watchlist"
      );
    }
  }

  async function handleUpdateTargetPrice(itemId: string) {
    setAddStatusMessage("");
    setAddErrorMessage("");

    if (!userId) {
      setAddErrorMessage("Please log in before updating your watchlist.");
      return;
    }

    const targetPriceValue = Number(editTargetPrices[itemId]);

    if (Number.isNaN(targetPriceValue) || targetPriceValue < 0) {
      setAddErrorMessage("Please enter a valid target price.");
      return;
    }

    try {
      const response = await fetch("/api/watchlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          userId,
          targetPrice: targetPriceValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update target price");
      }

      setAddStatusMessage("Target price updated.");
      loadWatchlist(userId);
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Unable to update target price"
      );
    }
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
            Search for Steam games and add them to your watchlist.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Search games</h2>

          <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Terraria, Portal, Hades..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
            />

            <button
              type="submit"
              disabled={isSearching}
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && (
            <p className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              {searchError}
            </p>
          )}

          {addStatusMessage && (
            <p className="mt-4 rounded-xl border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">
              {addStatusMessage}
            </p>
          )}

          {addErrorMessage && (
            <p className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              {addErrorMessage}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {searchResults.map((game) => (
              <div
                key={game.steamAppId}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div>
                  <h3 className="font-semibold">{game.name}</h3>
                  <p className="text-sm text-slate-400">
                    Steam App ID: {game.steamAppId}
                  </p>
                  <p className="text-sm text-slate-400">
                    Current price:{" "}
                    {game.currentPrice === null
                      ? "Unavailable"
                      : `$${Number(game.currentPrice).toFixed(2)}`}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetPrices[game.steamAppId] ?? ""}
                    onChange={(event) =>
                      setTargetPrices((current) => ({
                        ...current,
                        [game.steamAppId]: event.target.value,
                      }))
                    }
                    placeholder="Target price"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400 sm:w-32"
                  />

                  <button
                    onClick={() => handleAddToWatchlist(game)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-900"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}

            {searchResults.length === 0 && searchQuery.trim() && !isSearching && (
              <p className="text-sm text-slate-400">
                No results yet. Try searching for one of the starter games.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Watchlist</h2>

          {isLoadingWatchlist && (
            <p className="mt-2 text-slate-400">Loading watchlist...</p>
          )}

          {watchlistError && (
            <p className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              {watchlistError}
            </p>
          )}

          {!isLoadingWatchlist && watchlistItems.length === 0 && (
            <p className="mt-2 text-slate-400">No games are being watched yet.</p>
          )}

          <div className="mt-5 space-y-3">
            {watchlistItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold">{item.games.name}</h3>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <p className="text-sm text-slate-400">
                        Target price: ${Number(item.target_price).toFixed(2)}
                      </p>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editTargetPrices[item.id] ?? ""}
                        onChange={(event) =>
                          setEditTargetPrices((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="New target"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400 sm:w-32"
                      />

                      <button
                        onClick={() => handleUpdateTargetPrice(item.id)}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-900"
                      >
                        Update
                      </button>
                    </div>
                    <p className="text-sm text-slate-400">
                      Current price:{" "}
                      {item.games.current_price === null
                        ? "Not checked yet"
                        : `$${Number(item.games.current_price).toFixed(2)}`}
                    </p>
                    <p className="text-sm text-slate-400">
                      Alert status:{" "}
                      {item.alert_triggered
                        ? "Triggered"
                        : item.alert_enabled
                          ? "Watching"
                          : "Disabled"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {item.games.store_url && (
                      <a
                        href={item.games.store_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-900"
                      >
                        View on Steam
                      </a>
                    )}

                    <button
                      onClick={() => handleRemoveFromWatchlist(item.id)}
                      className="rounded-xl border border-red-900 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}