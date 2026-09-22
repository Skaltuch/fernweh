# Fernweh - a travel budget tracker

Fernweh is a React/Vite app for tracking spending, daily limits, savings goals,
and trends. Spending data remains local in the browser.

## Features

- **Settings**: monthly income, daily spend limit, "extra spend" alert
  threshold, and saving goal (name/amount/saved/target date).
- **Daily spending**: an add-expense form (amount, category, note) and today's
  list, each entry deletable.
- **Metrics**: today's remaining budget, month-to-date spend, average daily
  spend, projected month-end savings, a streak counter (consecutive days
  under your limit), a 30-day spend trend chart, and spend-by-category.
- **Goal tracking**: progress bar toward your savings goal.

## Run locally

You need Node.js 18+ installed.

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite.

Build for production with `npm run build`.

## Deploy to Vercel

Import the repository into Vercel with the repository root as the project
directory. The included `vercel.json` installs dependencies, builds the Vite
frontend, serves `frontend/dist`, and routes client-side paths to the app.

No environment variables or server process are required. Spending data remains
private in each browser because it is stored locally.

## Future options

- Add an export/import flow so browser data can move between devices.
- Add category budgets, not just a single daily limit.
- Add an optional hosted account service if multi-device sync is needed.
