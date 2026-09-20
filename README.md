# Fernweh - a private, frontend-only travel budget tracker

Fernweh is a React/Vite app for tracking spending, daily limits, savings goals,
trends, and browser reminders. All data is stored locally in the browser using
`localStorage`. No account, database, backend, or API key is required.

The old `backend/` folder is no longer used by the app and can be archived or
removed from the repository.

## Features

- **Settings**: monthly income, daily spend limit, "extra spend" alert
  threshold, saving goal (name/amount/saved/target date), reminder times,
  timezone.
- **Daily spending**: an add-expense form (amount, category, note) and today's
  list, each entry deletable.
- **Metrics**: today's remaining budget, month-to-date spend, average daily
  spend, projected month-end savings, a streak counter (consecutive days
  under your limit), a 30-day spend trend chart, and spend-by-category.
- **Goal tracking**: progress bar toward your savings goal.
- **Reminders**: a spending-aware browser notification every two hours plus
  configured reminder times, rotating motivation, saving, and good-vibes copy
  while the app is open. True server push is intentionally not used in this
  frontend-only build.

## Run locally

You need Node.js 18+ installed.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Settings and expenses persist on
that browser and device.

Build for production with `npm run build`.

## Phone use

Deploy the `frontend/` folder to Vercel, then:

1. Open the deployed HTTPS URL on your phone.
2. Add it to the home screen.
3. Open the shortcut and use the Goal page to enable reminders.

Because there is no backend, reminders run while the app is open. The browser
controls the system notification sound; Fernweh includes a soft chime for the
manual test action where the browser permits page audio. The budget data
remains private to the browser profile where it was entered.

## Deploy to Vercel

In Vercel, set:

```text
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

No environment variables are needed.

## Future options

- Add an export/import flow so browser data can move between devices.
- Add category budgets, not just a single daily limit.
- Add an optional hosted account service if multi-device sync is needed.
