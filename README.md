# Fernweh - a travel budget tracker with background push

Fernweh is a React/Vite app for tracking spending, daily limits, savings goals,
and trends. Spending data remains local in the browser. The `frontend/` folder
also contains a small Node/Express Web Push service that stores subscriptions
and sends scheduled reminders while the app is closed.

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
- **Reminders**: background Web Push notifications every two hours plus
  configured reminder times, with rotating motivation, saving, and good-vibes
  copy.

## Run locally

You need Node.js 18+ installed.

```bash
cd frontend
npm install
npm run generate-vapid
# copy push-config.example.js to push-config.js and paste the generated keys there
npm start
```

Open `http://localhost:4000`. The Node process serves the built frontend and
the push API together. For frontend-only development, use `npm run dev` and
run `npm run server` in a second terminal.

Build for production with `npm run build`.

## Phone use

Deploy the `frontend/` folder to a Node host such as Render, Railway, or Fly.io,
then:

1. Open the deployed HTTPS URL on your phone.
2. Add it to the home screen.
3. Open the shortcut and use the Goal page to enable reminders.

The push service keeps running in the background and sends the two-hour and
scheduled reminders while the app is closed. The browser and phone control the
system notification sound; Fernweh cannot force a custom sound. Spending data
remains private in the browser, while the push server stores only the latest
summary needed for notification text.

## Deploy the combined app

Configure the host with:

```text
Root Directory: frontend
Build Command: npm install
Start Command: npm start
```

For local use, copy `frontend/push-config.example.js` to
`frontend/push-config.js`. On Render, use environment variables instead so
the private key is never committed:

```text
PORT=4000
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:you@example.com
CORS_ORIGIN=https://your-service.onrender.com
```

The service must be always-on for the scheduler. Vercel static hosting alone
cannot run this Node process continuously.

## Future options

- Add an export/import flow so browser data can move between devices.
- Add category budgets, not just a single daily limit.
- Add an optional hosted account service if multi-device sync is needed.
