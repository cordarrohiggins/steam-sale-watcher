# Steam Sale Watcher

Steam Sale Watcher is a full-stack web app that lets users search for Steam games, add games to a personal watchlist, set custom sale alerts, browse public deals, track price history, and receive email notifications when games meet their alert rules.

## Live Demo

Vercel URL:  
https://steam-sale-watcher.vercel.app/

## Features

- Email/password authentication with Supabase
- Magic-link login fallback
- Password reset and password update support
- Real Steam game search
- Personal game watchlist
- Watchlist sorting, filtering, pagination, and image cards
- Target price alerts
- Discount percent alerts
- Instant dashboard alert-state updates when an alert rule already matches the current price
- Real Steam price checking
- Email notifications with Resend
- Duplicate alert prevention
- Scheduled price checks every 2 hours at the 15-minute mark with GitHub Actions
- Add, update, and remove watched games
- Responsive website-only design
- Shared navigation across main pages
- Logical “Go back” navigation
- Price and discount history with range filters and charts
- Daily shared price history points
- Public deals page for discounted paid games
- Public Steam Specials discovery for curated sale browsing
- Daily discovery refresh using a capped Steam Specials list instead of scanning the full Steam catalog
- Deal source badges, sorting, filtering, pagination, and tracked-count display
- Dedicated Free-to-Keep page for normally paid Steam games detected as temporarily free
- Optional free-to-keep email alerts for users who opt in
- IsThereAnyDeal candidate discovery with Steam verification before free-to-keep games are shown or emailed
- User settings page for alert, display, and search preferences
- Email alert frequency options: immediate alerts, daily digest, or email off
- Daily digest workflow for grouped deal alert emails
- User defaults for alert type, price history range, Steam search filters, and display time zone
- User-selectable display time zone for scheduled countdowns
- About/support page with project overview, credits, support email, GitHub link, and LinkedIn link

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Resend
- GitHub Actions
- Vercel
- Recharts
- IsThereAnyDeal API
- Steam store data

## How It Works

1. A user logs in with email/password or uses the magic-link fallback.
2. The user searches for a Steam game.
3. The user adds a game to their watchlist.
4. The user chooses either a target price alert or a discount percent alert.
5. A GitHub Actions workflow runs every 2 hours at the 15-minute mark.
6. The workflow calls a protected Next.js API route.
7. The app fetches current Steam price data for unique watched games.
8. The app compares each watched game against the user’s alert rule.
9. If the rule is met, the app marks the alert as triggered.
10. If the user chose immediate emails, the app sends an alert email during the scheduled checker.
11. If the user chose daily digest emails, the app records matching alerts and sends them later in one grouped daily digest.
12. If the user turned email alerts off, the app still shows dashboard deal badges without sending email.
13. The app prevents duplicate emails while the same alert remains triggered.
14. Price history begins once a game is first tracked through a user watchlist or appears in Steam Specials discovery.
15. The app saves one shared price history point per day when the game is checked.
16. The public deals page combines user-tracked discounted games with a capped Steam Specials discovery list.
17. The Steam Specials discovery workflow checks a capped list of Steam Specials games, saves discounted paid games, labels their source, and adds daily history points.
18. Free-to-keep detection uses IsThereAnyDeal as a candidate source, maps candidates to Steam app IDs, verifies current Steam pricing, saves active free-to-keep games, and optionally emails users who opted in.
19. Free-to-keep emails are grouped so one checker run sends one combined email per subscribed user instead of one email per game.

## Scheduled Jobs

The project uses GitHub Actions because the first version is designed to stay free and does not rely on paid Vercel cron jobs.

- `Check Steam Prices`: runs every 2 hours at the 15-minute mark and updates watched game prices, alert states, and daily price history.
- `Update Discovery Deals`: runs once per day around 8:40 PM Eastern and refreshes the public Steam Specials discovery list.
- `Send Daily Digest`: runs once per day around 8:50 PM Eastern and sends grouped deal emails to users who selected daily digest alerts.
- `Check Free Games`: runs once per day around 8:55 PM Eastern and checks curated deal candidates for normally paid Steam games that are temporarily free to keep.

GitHub Actions may start a few minutes late depending on GitHub’s scheduling queue.

## Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CHECK_PRICES_SECRET=
ITAD_API_KEY=

These same variables are also required in Vercel.

ITAD_API_KEY is used for IsThereAnyDeal candidate discovery in the Free-to-Keep feature.

GitHub Actions Secrets

The scheduled workflows use these repository secrets:

APP_URL=
CHECK_PRICES_SECRET=

APP_URL should be the deployed Vercel URL without a trailing API route.

Example:
https://steam-sale-watcher.vercel.app

Current Limitations
    - The app does not scan the full Steam catalog.
    - Watchlist alerts are not instant. They run on the scheduled checker, currently every 2 hours at the 15-minute mark.
    - The first version assumes the US Steam region and USD.
    - Steam store data is fetched server-side and may not behave exactly like a fully official API.
    - Email alerts use Resend. Free-tier sending limits apply.
    - Sale end dates are not currently shown because Steam does not consistently expose reliable discount expiration data through the store endpoints used by this app.
    - Price history begins once a game is first tracked through a user watchlist or appears in Steam Specials discovery. It does not include historical Steam prices from before the app started tracking that game.
    - Steam Specials discovery games only gain new history points on days when they appear in the capped discovery refresh or are added to a user watchlist.
    - The public deals page shows discounted paid games from user-tracked games and the capped Steam Specials discovery list. It does not scan the full Steam catalog for every active deal.
    - Steam Specials discovery refreshes once per day, so newly added Steam discounts may not appear immediately.
    - Daily digest emails only include alerts recorded after the user selects daily digest mode. Alerts that were already triggered before changing the setting may not be included unless the alert rule is updated or triggered again later.
    - The Free-to-Keep page uses curated IsThereAnyDeal candidates plus Steam verification. It does not scan the full Steam catalog, so some promotions may be missed.
    - Free-to-keep alerts are global opt-in alerts and are checked once per day, so they are not instant.
    - Free-to-keep detection may exclude demos, soundtracks, DLC, bundles, packages, or promotions that cannot be cleanly mapped to a Steam app ID.
    - Display time zone settings affect countdown and estimated-time displays only. Scheduled jobs still run on fixed GitHub Actions cron schedules.
    - Pricing currently assumes the US Steam region and USD. Multi-currency and regional pricing support are planned future improvements.
    - The interface currently uses English only. Language/localization support is planned as a future improvement.
    - Password reset and email confirmation flows depend on Supabase email delivery and may be affected by Supabase email rate limits during testing.

Future Improvements
    - Multi-currency and regional Steam pricing support
    - Language/localization support
    - Steam wishlist import
    - Browser push notifications
    - PWA install support
    - Genre filters
    - Minimum review score/count filters
    - More advanced deal discovery sources
    - More detailed free-to-keep promotion timing when reliable data is available
    - Discord webhook notifications
    - Better email templates and user notification controls
    - Architecture diagram and screenshots in the README

Resume Summary
    Built a full-stack Steam price tracking app with authenticated watchlists, real Steam price fetching, scheduled background checks, price history charts, public deal discovery, free-to-keep game detection, duplicate-alert prevention, and automated email alerts for user-defined sale thresholds using Next.js, Supabase, GitHub Actions, Resend, and IsThereAnyDeal.