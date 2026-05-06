# Steam Sale Watcher

Steam Sale Watcher is a full-stack web app that lets users search for Steam games, add games to a personal watchlist, set custom sale alerts, and receive email notifications when a game meets their alert rule.

## Live Demo

Vercel URL:  
https://steam-sale-watcher.vercel.app/

## Features

- Email magic-link authentication with Supabase
- Real Steam game search
- Personal game watchlist
- Target price alerts
- Discount percent alerts
- Real Steam price checking
- Email notifications with Resend
- Duplicate alert prevention
- Scheduled price checks every 2 hours with GitHub Actions
- Add, update, and remove watched games
- Responsive website-only design
- Price and discount history with range filters and charts
- Public deals page showing discounted tracked games
- Deal sorting and filtering by discount, price, recent checks, and tracked count
- User settings page for alert and display preferences
- Email alert frequency options: immediate alerts, daily digest, or email off
- Daily digest workflow for grouped deal alert emails
- User defaults for alert type, price history range, and Steam search filters
- Public Steam Specials discovery page for curated sale browsing
- Daily discovery refresh using a capped Steam Specials list instead of scanning the full Steam catalog
- Deal source badges, sorting, filtering, pagination, and tracked-count display
- User-selectable display time zone for scheduled countdowns

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Resend
- GitHub Actions
- Vercel

## How It Works

1. A user logs in with a magic email link.
2. The user searches for a Steam game.
3. The user adds a game to their watchlist.
4. The user chooses either a target price alert or a discount percent alert.
5. A GitHub Actions workflow runs every 2 hours.
6. The workflow calls a protected Next.js API route.
7. The app fetches current Steam price data.
8. The app compares each watched game against the user’s alert rule.
9. If the rule is met, the app sends an email alert.
10. The app marks the alert as triggered so users do not receive duplicate emails every 2 hours.
11. Users can choose how emails are delivered from the settings page. Immediate alerts are sent during the 2-hour price checker. Daily digest users have matching alerts collected and sent in one grouped email by a separate daily GitHub Actions workflow. Users can also turn email alerts off while still keeping dashboard deal badges.
12. The public deals page combines user-tracked discounted games with a curated Steam Specials discovery list. A separate daily GitHub Actions workflow calls a protected discovery endpoint, checks a capped list of Steam Specials games, saves discounted results, and labels those deals separately from user-tracked watchlist deals.

## Environment Variables

Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CHECK_PRICES_SECRET=
```

These same variables are also required in Vercel.

## GitHub Actions Secrets

The scheduled checker uses these repository secrets:

```env
APP_URL=
CHECK_PRICES_SECRET=
```

`APP_URL` should be the deployed Vercel URL without a trailing API route.

Example:

```text
https://steam-sale-watcher.vercel.app
```

The project uses three scheduled GitHub Actions workflows:

- `Check Steam Prices`: runs every 2 hours and updates tracked game prices, alert states, public deals, and daily price history.
- `Update Discovery Deals`: runs once per day and refreshes the public Steam Specials discovery list.
- `Send Daily Digest`: runs once per day and sends grouped deal emails to users who selected daily digest alerts.

## Current Limitations

- The app checks watched games only, not every Steam game.
- Alerts are not instant. They run on the scheduled checker, currently every 2 hours.
- The first version assumes US/USD Steam pricing.
- Steam store data is fetched server-side and may not behave exactly like a fully official API.
- Email alerts use Resend. Free-tier sending limits apply.
- Global alerts, such as “any game becomes free,” are planned as a future upgrade.
- Sale end dates are not currently shown because Steam does not consistently expose reliable discount expiration data through the store endpoints used by this app.
- Price history begins once a game is first tracked through a user watchlist or appears in Steam Specials discovery. It does not include historical Steam prices from before the app started tracking that game.
- The public deals page only shows games already tracked by Steam Sale Watcher users. It does not scan the full Steam catalog for every active deal.
- Daily digest emails only include alerts recorded after the user selects daily digest mode. Alerts that were already triggered before changing the setting may not be included unless the alert rule is updated or triggered again later.
- The public discovery page uses a capped Steam Specials list and does not scan the full Steam catalog.
- Steam Specials discovery refreshes once per day, so newly added Steam discounts may not appear immediately.
- Pricing currently assumes the US Steam region and USD. Multi-currency and regional pricing support are planned future improvements.
- The interface currently uses English only. Language/localization support is planned as a future improvement.
- Display time zone settings affect countdown and estimated-time displays only. Scheduled jobs still run on fixed UTC GitHub Actions cron schedules.
- Steam Specials discovery games only gain new history points on days when they appear in the capped discovery refresh or are added to a user watchlist.

## Future Improvements

- Global free-game alerts
- Global “under $5” deal alerts
- Price history chart
- Steam wishlist import
- Browser push notifications
- Public deals page
- User notification preferences

## Resume Summary

Built a full-stack Steam price tracking app with authenticated watchlists, real Steam price fetching, scheduled background checks, duplicate-alert prevention, and automated email alerts for user-defined sale thresholds.