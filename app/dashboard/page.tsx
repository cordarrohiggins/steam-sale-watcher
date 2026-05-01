import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          Back home
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
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