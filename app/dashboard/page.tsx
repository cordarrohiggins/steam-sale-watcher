"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import CheckCountdown from "@/components/CheckCountdown";

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
  target_price: number | null;
  target_discount_percent: number | null;
  alert_type: "target_price" | "target_discount";
  alert_enabled: boolean;
  alert_triggered: boolean;
  games: {
    id: string;
    steam_app_id: number;
    name: string;
    store_url: string | null;
    current_price: number | null;
    discount_percent: number | null;
    currency: string | null;
    is_free: boolean | null;
    last_checked_at: string | null;
    sale_ends_at: string | null;
  };
};

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SteamSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hideDlc, setHideDlc] = useState(true);
  const [hideSoundtracks, setHideSoundtracks] = useState(true);
  const [hideDemos, setHideDemos] = useState(true);
  const [hideExtras, setHideExtras] = useState(true);
  const [defaultAlertType, setDefaultAlertType] = useState<
    "target_price" | "target_discount"
  >("target_price");

  const [userId, setUserId] = useState<string | null>(null);
  const [addAlertTypes, setAddAlertTypes] = useState<
    Record<number, "target_price" | "target_discount">
  >({});
  const [targetPrices, setTargetPrices] = useState<Record<number, string>>({});
  const [targetDiscounts, setTargetDiscounts] = useState<Record<number, string>>({});
  const [addStatusMessage, setAddStatusMessage] = useState("");
  const [addErrorMessage, setAddErrorMessage] = useState("");
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  const [watchlistError, setWatchlistError] = useState("");
  const [editAlertTypes, setEditAlertTypes] = useState<
    Record<string, "target_price" | "target_discount">
  >({});

  const [editTargetPrices, setEditTargetPrices] = useState<Record<string, string>>({});
  const [editTargetDiscounts, setEditTargetDiscounts] = useState<Record<string, string>>({});

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      setUserEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
      if (data.session?.user.id) {
        loadWatchlist(data.session.user.id);

        const settingsResponse = await fetch(
          `/api/settings?userId=${data.session.user.id}`
        );

        const settingsData = await settingsResponse.json();

        if (settingsResponse.ok && settingsData.settings) {
          setHideDlc(settingsData.settings.hide_dlc);
          setHideSoundtracks(settingsData.settings.hide_soundtracks);
          setHideDemos(settingsData.settings.hide_demos);
          setHideExtras(settingsData.settings.hide_extras);
          setDefaultAlertType(settingsData.settings.default_alert_type);
        }
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

  const searchSteamGames = useCallback(async function searchSteamGames(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `/api/steam/search?q=${encodeURIComponent(
          trimmedQuery
        )}&hideDlc=${hideDlc}&hideSoundtracks=${hideSoundtracks}&hideDemos=${hideDemos}&hideExtras=${hideExtras}`
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
  }, [hideDlc, hideSoundtracks, hideDemos, hideExtras]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchSteamGames(searchQuery);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, searchSteamGames]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    searchSteamGames(searchQuery);
  }

  async function handleAddToWatchlist(game: SteamSearchResult) {
    setAddStatusMessage("");
    setAddErrorMessage("");

    if (!userId) {
      setAddErrorMessage("Please log in before adding games to your watchlist.");
      return;
    }

    const selectedAlertType = addAlertTypes[game.steamAppId] ?? defaultAlertType;

    const targetPriceValue =
      targetPrices[game.steamAppId] === undefined ||
      targetPrices[game.steamAppId] === ""
        ? null
        : Number(targetPrices[game.steamAppId]);

    const targetDiscountValue =
      targetDiscounts[game.steamAppId] === undefined ||
      targetDiscounts[game.steamAppId] === ""
        ? null
        : Number(targetDiscounts[game.steamAppId]);

    if (
      selectedAlertType === "target_price" &&
      (targetPriceValue === null ||
        Number.isNaN(targetPriceValue) ||
        targetPriceValue < 0)
    ) {
      setAddErrorMessage("Please enter a valid target price.");
      return;
    }

    if (
      selectedAlertType === "target_discount" &&
      (targetDiscountValue === null ||
        Number.isNaN(targetDiscountValue) ||
        targetDiscountValue < 0 ||
        targetDiscountValue > 100)
    ) {
      setAddErrorMessage("Please enter a valid discount percent from 0 to 100.");
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
          alertType: selectedAlertType,
          targetPrice: targetPriceValue,
          targetDiscountPercent: targetDiscountValue,
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

      setTargetDiscounts((current) => ({
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

  async function handleUpdateAlertRule(item: WatchlistItem) {
    setAddStatusMessage("");
    setAddErrorMessage("");

    if (!userId) {
      setAddErrorMessage("Please log in before updating your watchlist.");
      return;
    }

    const selectedAlertType = editAlertTypes[item.id] ?? item.alert_type;

    const targetPriceValue =
      editTargetPrices[item.id] === undefined || editTargetPrices[item.id] === ""
        ? item.target_price
        : Number(editTargetPrices[item.id]);

    const targetDiscountValue =
      editTargetDiscounts[item.id] === undefined || editTargetDiscounts[item.id] === ""
        ? item.target_discount_percent
        : Number(editTargetDiscounts[item.id]);

    if (
      selectedAlertType === "target_price" &&
      (targetPriceValue === null ||
        Number.isNaN(targetPriceValue) ||
        targetPriceValue < 0)
    ) {
      setAddErrorMessage("Please enter a valid target price.");
      return;
    }

    if (
      selectedAlertType === "target_discount" &&
      (targetDiscountValue === null ||
        Number.isNaN(targetDiscountValue) ||
        targetDiscountValue < 0 ||
        targetDiscountValue > 100)
    ) {
      setAddErrorMessage("Please enter a valid discount percent from 0 to 100.");
      return;
    }

    try {
      const response = await fetch("/api/watchlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.id,
          userId,
          alertType: selectedAlertType,
          targetPrice: targetPriceValue,
          targetDiscountPercent: targetDiscountValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update alert rule");
      }

      setAddStatusMessage("Alert rule updated.");
      loadWatchlist(userId);
    } catch (error) {
      setAddErrorMessage(
        error instanceof Error ? error.message : "Unable to update alert rule"
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-400 hover:text-white">
              Back home
            </Link>

            <Link href="/deals" className="text-sm text-slate-400 hover:text-white">
              Browse deals
            </Link>

            <Link href="/about" className="text-sm text-slate-400 hover:text-white">
              About
            </Link>

            <Link href="/settings" className="text-sm text-slate-400 hover:text-white">
              Settings
            </Link>
          </div>

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

        <div className="mt-8">
          <CheckCountdown type="two-hour-check" />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Search games</h2>

          <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search Terraria, Portal, Hades..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-11 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setSearchError("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hideDlc}
                onChange={(event) => setHideDlc(event.target.checked)}
                className="h-4 w-4"
              />
              Hide DLC
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hideSoundtracks}
                onChange={(event) => setHideSoundtracks(event.target.checked)}
                className="h-4 w-4"
              />
              Hide soundtracks
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hideDemos}
                onChange={(event) => setHideDemos(event.target.checked)}
                className="h-4 w-4"
              />
              Hide demos
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hideExtras}
                onChange={(event) => setHideExtras(event.target.checked)}
                className="h-4 w-4"
              />
              Hide extras
            </label>
          </div>

          {searchError && (
            <p className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              {searchError}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {searchResults.map((game) => (
              <div
                key={game.steamAppId}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-center gap-4">
                  {game.image && (
                    <Image
                      src={game.image}
                      alt={`${game.name} header image`}
                      width={184}
                      height={69}
                      className="h-16 w-36 rounded-lg object-cover"
                    />
                  )}

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
                </div>

                <div className="grid gap-2 sm:grid-cols-[170px_150px_auto] sm:items-center">
                  <select
                    value={addAlertTypes[game.steamAppId] ?? defaultAlertType}
                    onChange={(event) =>
                      setAddAlertTypes((current) => ({
                        ...current,
                        [game.steamAppId]: event.target.value as
                          | "target_price"
                          | "target_discount",
                      }))
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                  >
                    <option value="target_price">Target price</option>
                    <option value="target_discount">Discount percent</option>
                  </select>

                  {(addAlertTypes[game.steamAppId] ?? defaultAlertType) === "target_price" ? (
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
                      placeholder="Price"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={targetDiscounts[game.steamAppId] ?? ""}
                      onChange={(event) =>
                        setTargetDiscounts((current) => ({
                          ...current,
                          [game.steamAppId]: event.target.value,
                        }))
                      }
                      placeholder="Discount %"
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
                    />
                  )}

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
            
          {addStatusMessage && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">
            <p>{addStatusMessage}</p>

            <button
              type="button"
              onClick={() => setAddStatusMessage("")}
              className="rounded-lg px-2 py-1 text-green-200 transition hover:bg-green-900/60"
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {addErrorMessage && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
            <p>{addErrorMessage}</p>

            <button
              type="button"
              onClick={() => setAddErrorMessage("")}
              className="rounded-lg px-2 py-1 text-red-200 transition hover:bg-red-900/60"
              aria-label="Dismiss error message"
            >
              ×
            </button>
          </div>
        )}

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
                className={`rounded-xl border p-4 ${
                  item.alert_triggered
                    ? "border-green-700 bg-green-950/20 shadow-lg shadow-green-950/30"
                    : "border-slate-800 bg-slate-950"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">{item.games.name}</h3>

                      {item.alert_triggered && (
                        <span className="rounded-full border border-green-700 bg-green-950 px-3 py-1 text-xs font-semibold text-green-200">
                          Deal Alert Triggered
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-400">
                          Alert type:{" "}
                          {item.alert_type === "target_price"
                            ? "Target price"
                            : "Discount percent"}
                        </p>

                        {item.alert_type === "target_price" ? (
                          <p className="text-sm text-slate-400">
                            Target price:{" "}
                            {item.target_price === null
                              ? "Not set"
                              : `$${Number(item.target_price).toFixed(2)}`}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">
                            Target discount:{" "}
                            {item.target_discount_percent === null
                              ? "Not set"
                              : `${item.target_discount_percent}%`}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[180px_160px_auto] sm:items-center">
                        <select
                          value={editAlertTypes[item.id] ?? item.alert_type}
                          onChange={(event) =>
                            setEditAlertTypes((current) => ({
                              ...current,
                              [item.id]: event.target.value as "target_price" | "target_discount",
                            }))
                          }
                          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                        >
                          <option value="target_price">Target price</option>
                          <option value="target_discount">Discount percent</option>
                        </select>

                        {(editAlertTypes[item.id] ?? item.alert_type) === "target_price" ? (
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
                            placeholder="Price"
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
                          />
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={editTargetDiscounts[item.id] ?? ""}
                            onChange={(event) =>
                              setEditTargetDiscounts((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="Discount %"
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
                          />
                        )}

                        <button
                          onClick={() => handleUpdateAlertRule(item)}
                          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-900"
                        >
                          Update
                        </button>
                      </div>
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

                    <Link
                      href={`/games/${item.games.id}`}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-900"
                    >
                      View history
                    </Link>

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