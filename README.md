# Fernweh — a budget tracker built to fund a trip abroad

A React (Vite) frontend + Node/Express backend. You set your income, a daily
spending limit, a savings goal, and an "over threshold" alert. Every expense
you log updates a live dashboard, and the backend pushes phone notifications
at times you choose — a spending check plus a motivational quote.

```
fernweh/
  backend/    Express API + SQLite + web-push + cron reminders
  frontend/   React app (Vite) — the UI you open on your phone
```

## 1. What each piece does

- **Settings**: monthly income, daily spend limit, "extra spend" alert
  threshold, saving goal (name/amount/saved/target date), reminder times,
  timezone.
- **Daily spending**: an add-expense form (amount, category, note) and today's
  list, each entry deletable.
- **Metrics**: today's remaining budget, month-to-date spend, average daily
  spend, projected month-end savings, a streak counter (consecutive days
  under your limit), a 30-day spend trend chart, and spend-by-category.
- **Goal tracking**: progress bar toward your savings goal.
- **Notifications**: real push notifications (Web Push API) sent by the
  backend at your chosen times each day (spending check + motivational
  quote), plus an instant alert the moment a day's spending crosses your
  "extra spend" threshold.

## 2. Install and run locally

You need Node.js 18+ installed.

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run generate-vapid      # prints a VAPID public/private key pair
```

Paste the two keys it prints into `.env` as `VAPID_PUBLIC_KEY` and
`VAPID_PRIVATE_KEY` (a `VAPID_SUBJECT` of `mailto:you@example.com` is fine
to leave as-is). Then start the server:

```bash
npm start          # http://localhost:4000
```

The SQLite database file (`fernweh.db`) is created automatically on first
run — no separate database setup needed for local use.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Open `http://localhost:5173` in your browser. The dev server proxies
`/api/*` calls to the backend on port 4000, so you don't need to configure
anything else locally.

On first load you'll be prompted to fill in your budget (income, daily
limit, saving goal, reminder times) — that's the `Budget` button in the
header if you want to change it later.

## 3. Using it on your phone (so push notifications actually work)

Push notifications require the page to be served over HTTPS (localhost is
exempt, but your phone can't reach your laptop's `localhost`). The
straightforward path:

1. Deploy the frontend and backend (see below).
2. On your phone, open the deployed frontend URL in the browser.
3. Add it to your home screen (iOS Safari: Share → **Add to Home Screen**;
   Android Chrome: menu → **Install app** / **Add to Home Screen**). This
   makes it behave like a standalone app (see `frontend/public/manifest.json`).
4. Open it from the home screen icon, tap **Enable reminders** under
   "Reminders", and accept the notification permission prompt.
5. Use **Send test** to confirm a push arrives before relying on the
   scheduled reminders.

iOS note: push notifications for home-screen web apps need iOS 16.4+, and
the app **must** be opened from the home-screen icon (not Safari directly)
the first time you enable them.

## 4. Deploying

### Frontend → Vercel

Point Vercel at the `frontend/` folder (framework preset: Vite). Set the
build command to `npm run build` and output directory to `dist` (Vercel
usually detects this automatically). If your backend lives on a different
domain, set an environment variable in Vercel:

```
VITE_API_BASE=https://your-backend-domain.com
```

and redeploy — `src/api.js` reads this to prefix every API call.

### Backend → not Vercel serverless (important)

The backend keeps two things that don't fit Vercel's serverless functions:

1. **A SQLite file on disk.** Serverless functions get an ephemeral
   filesystem, so `fernweh.db` would reset on every cold start.
2. **A running cron job** (`node-cron`, checked every minute) that fires
   your scheduled reminders. Serverless functions only run when invoked —
   there's no long-lived process to tick the clock.

Easiest fixes, pick one:

- **Simplest — a small always-on host**: deploy `backend/` as-is to
  [Render](https://render.com), [Railway](https://railway.app), or
  [Fly.io](https://fly.io) (all have free/cheap tiers for a Node service).
  SQLite and `node-cron` both work unmodified there.
- **Stay on Vercel for everything**: swap SQLite for a hosted database
  (e.g. [Turso](https://turso.tech) (SQLite-compatible), Vercel Postgres, or
  Supabase), rewrite `db.js` to that client, and replace `node-cron` with a
  [Vercel Cron Job](https://vercel.com/docs/cron-jobs) that hits a new
  `/api/cron/tick` route once a minute — move the body of
  `cron/reminders.js`'s scheduled callback into that route handler.

Whichever you choose, set these environment variables on the backend host:

```
PORT=4000
DB_PATH=./fernweh.db          # or your hosted DB connection string, if you swap it
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

## 5. API reference (for extending it)

```
GET    /api/settings
PUT    /api/settings              { monthlyIncome, savingGoalName, savingGoalAmount,
                                     savingGoalSaved, savingGoalTargetDate,
                                     dailySpendLimit, extraSpendThreshold,
                                     reminderTimes: ["HH:MM", ...], timezone }

GET    /api/expenses?date=YYYY-MM-DD
GET    /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
POST   /api/expenses              { amount, category, note?, date? }
DELETE /api/expenses/:id

GET    /api/metrics/summary       today / month / streak / trend / byCategory / goal

GET    /api/push/vapid-public-key
POST   /api/push/subscribe        (browser PushSubscription object)
POST   /api/push/unsubscribe      { endpoint }
POST   /api/push/test             sends one test push to all subscribed devices
```

## 6. Where to take it next

- Swap the single-user `settings` row for real accounts if more than one
  person will use it.
- Add a "mark as saved" flow that moves money from month-end surplus into
  `savingGoalSaved` automatically.
- Add category budgets, not just a single daily limit.
- Add data export (CSV) — the `expenses` table already has everything
  needed.
