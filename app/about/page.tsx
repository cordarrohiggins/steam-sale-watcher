import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            Back home
          </Link>

          <Link
            href="/deals"
            className="text-sm text-slate-400 hover:text-white"
          >
            Browse deals
          </Link>

          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            About the project
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Steam Sale Watcher
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Steam Sale Watcher is a full-stack web app built to help users track
            Steam game prices, create personalized watchlists, and receive email
            alerts when games meet their chosen sale rules.
          </p>

          <p className="mt-4 max-w-3xl leading-7 text-slate-300">
            Users can search for Steam games, add games to a watchlist, set
            target price or discount percent alerts, and choose how they want to
            receive email notifications. The app also includes a public deals
            page powered by tracked games and a curated Steam Specials discovery
            list.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Core features</h2>

            <ul className="mt-4 space-y-3 text-slate-300">
              <li>Authenticated user watchlists with Supabase magic links</li>
              <li>Live Steam game search with filters for DLC, demos, soundtracks, and extras</li>
              <li>Target price and discount percent alerts</li>
              <li>Email alerts through immediate notifications or daily digests</li>
              <li>Scheduled price checks every 2 hours</li>
              <li>Daily price history tracking with charts and range filters</li>
              <li>Public deals page with Steam Specials discovery, sorting, filtering, and pagination</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Tech stack</h2>

            <ul className="mt-4 space-y-3 text-slate-300">
              <li>Next.js and TypeScript</li>
              <li>Tailwind CSS</li>
              <li>Supabase Auth and Supabase Postgres</li>
              <li>Resend email delivery</li>
              <li>GitHub Actions scheduled jobs</li>
              <li>Vercel deployment</li>
              <li>Recharts for price history visualizations</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">How it works</h2>

          <div className="mt-4 space-y-4 leading-7 text-slate-300">
            <p>
              Steam Sale Watcher checks games that users add to their watchlists
              instead of scanning the entire Steam catalog. This keeps the app
              focused, safer, and more efficient.
            </p>

            <p>
              A scheduled GitHub Actions workflow calls a protected API route
              every 2 hours. That route updates current prices, checks alert
              rules, records alert events, and sends emails based on each user’s
              notification settings.
            </p>

            <p>
              Price history is saved once per day per tracked game. History
              begins once any user adds a game to their watchlist, so older Steam
              prices from before the app tracked the game are not available.
            </p>

            <p>
              The public deals page combines user-tracked discounted games with
              a capped daily Steam Specials discovery list. It does not scan all
              Steam games.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Support</h2>

            <p className="mt-4 leading-7 text-slate-300">
              If you run into a bug, notice incorrect sale information, or have
              feedback about the project, you can contact me by email.
            </p>

            <a
              href="mailto:cordarrohiggins@gmail.com?subject=Steam%20Sale%20Watcher%20Support"
              className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Email support
            </a>

            <p className="mt-3 text-sm text-slate-400">
              cordarrohiggins@gmail.com
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Credits</h2>

            <p className="mt-4 leading-7 text-slate-300">
              Steam Sale Watcher was designed and developed by{" "}
              <span className="font-semibold text-white">
                Cordarro Higgins Redman
              </span>
              , a recent Clemson University Computer Science graduate building practical
              full-stack projects as portfolio pieces while actively job hunting for
              software engineering opportunities.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/cordarrohiggins"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold transition hover:bg-slate-800"
              >
                GitHub
              </a>

              <a
                href="https://www.linkedin.com/in/cordarro-higgins-redman/"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-700 px-5 py-3 text-center font-semibold transition hover:bg-slate-800"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Support future work</h2>

          <p className="mt-4 leading-7 text-slate-300">
            If you would like to support me, future projects, or continued improvements
            to Steam Sale Watcher, feel free to reach out by email. I do not have a
            donation link set up here yet, but I appreciate any interest in supporting
            the work.
          </p>

          <a
            href="mailto:cordarrohiggins@gmail.com?subject=Supporting%20Steam%20Sale%20Watcher"
            className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Email me about support
          </a>

          <p className="mt-3 text-sm text-slate-400">
            cordarrohiggins@gmail.com
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Important limitations</h2>

          <ul className="mt-4 space-y-3 text-slate-300">
            <li>Alerts are not instant. Watchlist prices are checked every 2 hours.</li>
            <li>Public discovery deals refresh once per day.</li>
            <li>Sale end dates are not currently shown because Steam does not consistently expose reliable sale expiration data through the store endpoints used by this app.</li>
            <li>Price history starts when the app first begins tracking a game.</li>
            <li>The public deals page uses a capped Steam Specials discovery list, not a full Steam catalog scan.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}