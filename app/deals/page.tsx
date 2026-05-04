"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
};

type SortOption = "discount" | "lowest-price" | "recently-checked" | "most-tracked";
type FilterOption = "all" | "free" | "under-5" | "under-10";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("discount");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

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

      if (filterBy === "free") {
        return deal.is_free === true || price === 0;
      }

      if (filterBy === "under-5") {
        return price !== null && price <= 5;
      }

      if (filterBy === "under-10") {
        return price !== null && price <= 10;
      }

      return true;
    });

    return [...filteredDeals].sort((a, b) => {
      if (sortBy === "lowest-price") {
        const priceA = a.is_free ? 0 : a.current_price ?? Number.MAX_VALUE;
        const priceB = b.is_free ? 0 : b.current_price ?? Number.MAX_VALUE;

        return priceA - priceB;
      }

      if (sortBy === "recently-checked") {
        const dateA = a.last_checked_at
          ? new Date(a.last_checked_at).getTime()
          : 0;
        const dateB = b.last_checked_at
          ? new Date(b.last_checked_at).getTime()
          : 0;

        return dateB - dateA;
      }

      if (sortBy === "most-tracked") {
        return b.tracked_count - a.tracked_count;
      }

      return (b.discount_percent ?? 0) - (a.discount_percent ?? 0);
    });
  }, [deals, filterBy, sortBy]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link href="/" className="text-sm text-slate-400 hover:text-white">
              Back home
            </Link>

            <h1 className="mt-5 text-4xl font-bold">Public Deals</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Browse discounted games currently tracked by Steam Sale Watcher users.
              This page uses games already in the app, not a full scan of the entire
              Steam catalog.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-900"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-300">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="discount">Biggest discount</option>
                <option value="lowest-price">Lowest price</option>
                <option value="recently-checked">Recently checked</option>
                <option value="most-tracked">Most tracked</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300">
                Filter
              </label>
              <select
                value={filterBy}
                onChange={(event) => setFilterBy(event.target.value as FilterOption)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="all">All deals</option>
                <option value="free">Free only</option>
                <option value="under-5">Under $5</option>
                <option value="under-10">Under $10</option>
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

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleDeals.map((deal) => (
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

                  <div className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold">
                    {deal.is_free
                      ? "Free"
                      : `${deal.discount_percent ?? 0}% off`}
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
                    Sale ends:{" "}
                    {deal.sale_ends_at
                      ? new Date(deal.sale_ends_at).toLocaleDateString()
                      : deal.discount_percent && deal.discount_percent > 0
                        ? "Unknown"
                        : "Not currently on sale"}
                  </p>
                  <p>
                    Last checked:{" "}
                    {deal.last_checked_at
                      ? new Date(deal.last_checked_at).toLocaleString()
                      : "Unknown"}
                  </p>
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
      </section>
    </main>
  );
}