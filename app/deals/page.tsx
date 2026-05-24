"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CheckCountdown from "@/components/CheckCountdown";
import { supabase } from "@/lib/supabaseClient";
import AppNav from "@/components/AppNav";

type Deal = {
  id: string;
  steam_app_id: number;
  name: string;
  header_image: string | null;
  store_url: string | null;
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string | null;
  is_free: boolean | null;
  sale_ends_at: string | null;
  last_checked_at: string | null;
  tracked_count: number;
  discovery_sources: string[];
  best_discovery_rank: number | null;
  discovery_last_seen_at: string | null;
  is_discovery_deal: boolean;
  is_tracked_deal: boolean;
};

type SortOption =
  | "discount"
  | "lowest-price"
  | "most-tracked"
  | "discovery-rank"
  | "title";

type FilterOption =
  | "all"
  | "under-5"
  | "under-10"
  | "50-off"
  | "75-off"
  | "90-off";

type SourceFilterOption = "all" | "tracked" | "specials";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("discount");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterOption>("all");
  const [displayTimeZone, setDisplayTimeZone] = useState("auto");
  const [itemsPerPage, setItemsPerPage] = useState<"10" | "20" | "50" | "all">("20");
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    async function loadDeals() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/deals");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load deals");
        }

        setDeals(data.deals ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load deals"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDeals();
  }, []);

  const visibleDeals = useMemo(() => {
    const filteredDeals = deals.filter((deal) => {
      const price = deal.is_free ? 0 : deal.current_price;

      if (sourceFilter === "tracked" && !deal.is_tracked_deal) {
        return false;
      }

      if (sourceFilter === "specials" && !deal.discovery_sources.includes("specials")) {
        return false;
      }

      if (filterBy === "under-5") {
        return price !== null && price <= 5;
      }

      if (filterBy === "under-10") {
        return price !== null && price <= 10;
      }

      if (filterBy === "50-off") {
        return (deal.discount_percent ?? 0) >= 50;
      }

      if (filterBy === "75-off") {
        return (deal.discount_percent ?? 0) >= 75;
      }

      if (filterBy === "90-off") {
        return (deal.discount_percent ?? 0) >= 90;
      }

      return true;
    });

    return [...filteredDeals].sort((a, b) => {
      if (sortBy === "lowest-price") {
        const priceA = a.is_free ? 0 : a.current_price ?? Number.MAX_VALUE;
        const priceB = b.is_free ? 0 : b.current_price ?? Number.MAX_VALUE;

        return priceA - priceB;
      }

      if (sortBy === "most-tracked") {
        return b.tracked_count - a.tracked_count;
      }

      if (sortBy === "discovery-rank") {
        const rankA = a.best_discovery_rank ?? Number.MAX_VALUE;
        const rankB = b.best_discovery_rank ?? Number.MAX_VALUE;

        return rankA - rankB;
      }

      if (sortBy === "title") {
        return a.name.localeCompare(b.name);
      }

      return (b.discount_percent ?? 0) - (a.discount_percent ?? 0);
    });
  }, [deals, filterBy, sortBy, sourceFilter]);

  const totalPages =
    itemsPerPage === "all"
      ? 1
      : Math.max(1, Math.ceil(visibleDeals.length / Number(itemsPerPage)));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDeals =
    itemsPerPage === "all"
      ? visibleDeals
      : visibleDeals.slice(
          (safeCurrentPage - 1) * Number(itemsPerPage),
          safeCurrentPage * Number(itemsPerPage)
        );

  const firstVisibleDealNumber =
    visibleDeals.length === 0
      ? 0
      : itemsPerPage === "all"
        ? 1
        : (safeCurrentPage - 1) * Number(itemsPerPage) + 1;

  const lastVisibleDealNumber =
    itemsPerPage === "all"
      ? visibleDeals.length
      : Math.min(safeCurrentPage * Number(itemsPerPage), visibleDeals.length);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <AppNav />

            <h1 className="mt-5 text-4xl font-bold">Public Deals</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Browse discounted games from tracked user watchlists and Steam Specials
              discovery. This page uses a curated daily discovery list, not a full scan of
              the entire Steam catalog.
            </p>
            <div className="mt-5 max-w-xl">
              <CheckCountdown type="daily-discovery" displayTimeZone={displayTimeZone} />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortOption);
                  setCurrentPage(1);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="discount">Biggest discount</option>
                <option value="lowest-price">Lowest price</option>
                <option value="most-tracked">Most tracked</option>
                <option value="discovery-rank">Steam Specials rank</option>
                <option value="title">Game title</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Filter
              </label>
              <select
                value={filterBy}
                onChange={(event) => {
                  setFilterBy(event.target.value as FilterOption);
                  setCurrentPage(1);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="all">All deals</option>
                <option value="under-5">Under $5</option>
                <option value="under-10">Under $10</option>
                <option value="50-off">50% off or more</option>
                <option value="75-off">75% off or more</option>
                <option value="90-off">90% off or more</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Source
              </label>
              <select
                value={sourceFilter}
                onChange={(event) => {
                  setSourceFilter(event.target.value as SourceFilterOption);
                  setCurrentPage(1);
                }}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="all">All sources</option>
                <option value="tracked">Tracked by users</option>
                <option value="specials">Steam Specials</option>
              </select>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Showing</p>
              <p className="mt-1 text-2xl font-semibold">
                {visibleDeals.length} deal{visibleDeals.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <p className="mt-8 text-sm text-slate-400">Loading deals...</p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && visibleDeals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">No deals found</h2>
            <p className="mt-2 text-slate-400">
              Deals appear here when tracked games are discounted or free.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && visibleDeals.length > 0 && (
          <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-400">
                Showing {firstVisibleDealNumber}-{lastVisibleDealNumber} of{" "}
                {visibleDeals.length} deal{visibleDeals.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm text-slate-300">
                Deals per page
              </label>

              <select
                value={itemsPerPage}
                onChange={(event) => {
                  setItemsPerPage(event.target.value as "10" | "20" | "50" | "all");
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1 || itemsPerPage === "all"}
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-400">
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages || itemsPerPage === "all"}
                  onClick={() =>
                    setCurrentPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedDeals.map((deal) => (
            <div
              key={deal.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              <Image
                src={
                  deal.header_image ??
                  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steam_app_id}/header.jpg`
                }
                alt={`${deal.name} header image`}
                width={460}
                height={215}
                className="h-40 w-full object-cover"
              />

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{deal.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Tracked by {deal.tracked_count} watchlist{" "}
                      {deal.tracked_count === 1 ? "entry" : "entries"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold">
                      {deal.is_free
                        ? "Free"
                        : `${deal.discount_percent ?? 0}% off`}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {deal.is_tracked_deal && (
                        <span className="rounded-full border border-blue-800 bg-blue-950 px-2 py-1 text-xs text-blue-200">
                          Tracked
                        </span>
                      )}

                      {deal.discovery_sources.includes("specials") && (
                        <span className="rounded-full border border-purple-800 bg-purple-950 px-2 py-1 text-xs text-purple-200">
                          Steam Specials
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-sm text-slate-300">
                  <p>
                    Current price:{" "}
                    {deal.is_free
                      ? "Free"
                      : deal.current_price === null
                        ? "Unavailable"
                        : `$${Number(deal.current_price).toFixed(2)}`}
                  </p>
                  <p>
                    Original price:{" "}
                    {deal.original_price === null
                      ? "Unavailable"
                      : `$${Number(deal.original_price).toFixed(2)}`}
                  </p>
                  <p>
                    Last checked:{" "}
                    {deal.last_checked_at
                      ? new Date(deal.last_checked_at).toLocaleString()
                      : "Unknown"}
                  </p>
                  {deal.best_discovery_rank !== null && (
                    <p>Steam Specials rank: #{deal.best_discovery_rank}</p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {deal.store_url && (
                    <a
                      href={deal.store_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-800"
                    >
                      View on Steam
                    </a>
                  )}

                  <Link
                    href={`/games/${deal.id}`}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-800"
                  >
                    Price history
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!isLoading && !errorMessage && visibleDeals.length > 0 && (
          <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-400">
              Showing {firstVisibleDealNumber}-{lastVisibleDealNumber} of{" "}
              {visibleDeals.length} deal{visibleDeals.length === 1 ? "" : "s"}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeCurrentPage <= 1 || itemsPerPage === "all"}
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-slate-400">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages || itemsPerPage === "all"}
                onClick={() =>
                  setCurrentPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}