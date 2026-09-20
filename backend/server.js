import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import webpush from "web-push";

import settingsRouter from "./routes/settings.js";
import expensesRouter from "./routes/expenses.js";
import metricsRouter from "./routes/metrics.js";
import pushRouter from "./routes/push.js";
import { startReminderScheduler } from "./cron/reminders.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:you@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn(
    "[fernweh] VAPID keys not set — push notifications are disabled until you run `npm run generate-vapid` and fill in .env"
  );
}

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/settings", settingsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/push", pushRouter);

startReminderScheduler();

app.listen(PORT, () => {
  console.log(`[fernweh] backend listening on http://localhost:${PORT}`);
});
