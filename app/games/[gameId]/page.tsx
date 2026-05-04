"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PriceHistoryItem = {
  id: string;
  price: number | null;
  original_price: number | null;
  discount_percent: number;
  currency: string;
  is_free: boolean;
  checked_at: string;
};

type GameInfo = {
  id: string;
  name: string;
  steam_app_id: number;
  store_url: string | null;
  header_image: string | null;
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string | null;
  is_free: boolean | null;
  sale_ends_at: string | null;
};

export default function GameHistoryPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [range, setRange] = useState("1m");
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

    const chartData = [...priceHistory]
    .reverse()
    .map((historyItem) => ({
      date: new Date(historyItem.checked_at).toLocaleDateString(),
      price: historyItem.is_free ? 0 : historyItem.price,
      originalPrice: historyItem.original_price,
      discount: historyItem.discount_percent,
    }));

  const validPrices = priceHistory
    .map((historyItem) => (historyItem.is_free ? 0 : historyItem.price))
    .filter((price): price is number => price !== null);

  const lowestTrackedPrice =
    validPrices.length > 0 ? Math.min(...validPrices) : null;

  const highestTrackedPrice =
    validPrices.length > 0 ? Math.max(...validPrices) : null;

  const highestTrackedDiscount =
    priceHistory.length > 0
      ? Math.max(...priceHistory.map((historyItem) => historyItem.discount_percent))
      : null;

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/price-history?gameId=${gameId}&range=${range}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load price history");
        }

        setGameInfo(data.game ?? null);
        setPriceHistory(data.priceHistory ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load price history"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [gameId, range]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
          Back to dashboard
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {gameInfo && (
                    <Image
                    src={
                        gameInfo.header_image ??
                        `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${gameInfo.steam_app_id}/header.jpg`
                    }
                    alt={`${gameInfo.name} header image`}
                    width={460}
                    height={215}
                    className="w-full rounded-xl border border-slate-800 object-cover sm:w-72"
                    />
                )}

                <div>
                    <h1 className="text-3xl font-bold">
                    {gameInfo?.name ?? "Price History"}
                    </h1>

                    {gameInfo && (
                    <div className="mt-3 space-y-1 text-sm text-slate-300">
                  <p>
                    Current price:{" "}
                    {gameInfo.current_price === null
                      ? "Unavailable"
                      : `$${Number(gameInfo.current_price).toFixed(2)}`}
                  </p>
                  <p>Discount: {gameInfo.discount_percent ?? 0}%</p>
                  <p>
                    Sale ends:{" "}
                    {gameInfo.sale_ends_at
                      ? new Date(gameInfo.sale_ends_at).toLocaleDateString()
                      : gameInfo.discount_percent && gameInfo.discount_percent > 0
                        ? "Unknown"
                        : "Not currently on sale"}
                  </p>
                </div>
              )}
            </div>
        </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="1w">1 week</option>
                <option value="1m">1 month</option>
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="1y">1 year</option>
                <option value="all">All time</option>
              </select>

              {gameInfo?.store_url && (
                <a
                  href={gameInfo.store_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm font-semibold transition hover:bg-slate-800"
                >
                  View on Steam
                </a>
              )}
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-400">
            Price history begins once any user adds this game to their watchlist. From
            that point on, Steam Sale Watcher checks the game during scheduled price
            updates and saves one shared history point per day for that game. Prices
            from before the game was first tracked are not available.
          </p>

          {isLoading && (
            <p className="mt-6 text-sm text-slate-400">Loading price history...</p>
          )}

          {errorMessage && (
            <p className="mt-6 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              {errorMessage}
            </p>
          )}

                    {!isLoading && !errorMessage && priceHistory.length === 0 && (
            <p className="mt-6 text-sm text-slate-400">
              No price history yet.
            </p>
          )}

          {priceHistory.length > 0 && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Lowest tracked price</p>
                  <p className="mt-1 text-xl font-semibold">
                    {lowestTrackedPrice === null
                      ? "Unavailable"
                      : `$${lowestTrackedPrice.toFixed(2)}`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Highest tracked price</p>
                  <p className="mt-1 text-xl font-semibold">
                    {highestTrackedPrice === null
                      ? "Unavailable"
                      : `$${highestTrackedPrice.toFixed(2)}`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Highest discount</p>
                  <p className="mt-1 text-xl font-semibold">
                    {highestTrackedDiscount === null
                      ? "Unavailable"
                      : `${highestTrackedDiscount}%`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">History points</p>
                  <p className="mt-1 text-xl font-semibold">
                    {priceHistory.length}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Price over time</h2>
                  <p className="text-sm text-slate-400">
                    Current price and original price based on saved daily checks.
                  </p>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="price"
                        name="Current price"
                        strokeWidth={2}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="originalPrice"
                        name="Original price"
                        strokeWidth={2}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Discount over time</h2>
                  <p className="text-sm text-slate-400">
                    Discount percent from each saved daily price check.
                  </p>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="discount"
                        name="Discount percent"
                        strokeWidth={2}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-130 text-left text-sm">
                  <thead className="text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Price</th>
                      <th className="py-2 pr-4 font-medium">Original</th>
                      <th className="py-2 pr-4 font-medium">Discount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {priceHistory.map((historyItem) => (
                      <tr
                        key={historyItem.id}
                        className="border-b border-slate-900"
                      >
                        <td className="py-2 pr-4 text-slate-300">
                          {new Date(historyItem.checked_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-4 text-slate-300">
                          {historyItem.is_free
                            ? "Free"
                            : historyItem.price === null
                              ? "Unavailable"
                              : `$${Number(historyItem.price).toFixed(2)}`}
                        </td>
                        <td className="py-2 pr-4 text-slate-300">
                          {historyItem.original_price === null
                            ? "Unavailable"
                            : `$${Number(historyItem.original_price).toFixed(2)}`}
                        </td>
                        <td className="py-2 pr-4 text-slate-300">
                          {historyItem.discount_percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}