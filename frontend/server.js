import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import webpush from "web-push";

let config = {};
try {
  config = (await import("./push-config.js")).default;
} catch {
  // Render uses dashboard environment variables instead of the local config file.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeConfig = {
  port: process.env.PORT || config.port || 4000,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || config.vapidPublicKey,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || config.vapidPrivateKey,
  vapidSubject: process.env.VAPID_SUBJECT || config.vapidSubject,
  corsOrigin: process.env.CORS_ORIGIN || config.corsOrigin,
};
const PORT = runtimeConfig.port;
const DATA_FILE = path.join(__dirname, "push-data.json");
const allowedOrigins = (runtimeConfig.corsOrigin || "http://localhost:5173").split(",").map((value) => value.trim());
const messages = [
  ["A little progress, Skaltuchet", "Future-you is going to love the choices you make today."],
  ["Your goal is getting stronger", "Every amount you keep is building more freedom later."],
  ["Good vibes, better plans", "Take a breath. You are doing better than yesterday's version of you."],
];

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { subscriptions: {}, snapshots: {} };
  }
}

let data = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function randomMessage() {
  return messages[Math.floor(Math.random() * messages.length)];
}

function zonedNow(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function snapshotLine(snapshot) {
  const today = snapshot?.today || {};
  const format = (value) => `${Number(value || 0).toFixed(3)} TND`;
  const spent = format(today.spent);
  if (!today.limit) return `You have spent ${spent} today.`;
  return today.overLimit
    ? `You have spent ${spent} today and are ${format(Math.abs(Number(today.remaining || 0)))} over your limit.`
    : `You can spend ${format(Math.max(Number(today.remaining || 0), 0))} more today.`;
}

async function sendDueNotifications() {
  if (!runtimeConfig.vapidPublicKey || !runtimeConfig.vapidPrivateKey) return;
  for (const [endpoint, record] of Object.entries(data.subscriptions)) {
    const now = zonedNow(record.timezone);
    const currentMs = Date.now();
    const dueScheduled = record.reminderTimes?.includes(now.time) && record.lastScheduledKey !== `${now.date}.${now.time}`;
    const dueTwoHour = !record.lastTwoHourAt || currentMs - record.lastTwoHourAt >= 2 * 60 * 60 * 1000;
    if (!dueScheduled && !dueTwoHour) continue;

    const [title, message] = randomMessage();
    const payload = JSON.stringify({
      title,
      body: `${message} ${snapshotLine(record.snapshot)}`,
      tag: dueScheduled ? `fernweh-scheduled-${now.time}` : "fernweh-two-hour",
    });
    try {
      await webpush.sendNotification(record.subscription, payload);
      if (dueScheduled) record.lastScheduledKey = `${now.date}.${now.time}`;
      if (dueTwoHour) record.lastTwoHourAt = currentMs;
      saveData();
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) delete data.subscriptions[endpoint];
      else console.error("[fernweh] push failed:", error.message);
      saveData();
    }
  }
}

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "dist")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/push/vapid-public-key", (_req, res) => res.json({ publicKey: runtimeConfig.vapidPublicKey || null }));
app.post("/api/push/subscribe", (req, res) => {
  const { subscription, settings, summary } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "A push subscription is required." });
  data.subscriptions[subscription.endpoint] = {
    subscription,
    timezone: settings?.timezone || "UTC",
    reminderTimes: settings?.reminderTimes || [],
    snapshot: summary || null,
    lastTwoHourAt: Date.now(),
    lastScheduledKey: null,
  };
  saveData();
  res.json({ ok: true });
});
app.post("/api/push/snapshot", (req, res) => {
  const { endpoint, settings, summary } = req.body || {};
  const record = endpoint && data.subscriptions[endpoint];
  if (!record) return res.status(404).json({ error: "Subscription not found." });
  record.timezone = settings?.timezone || record.timezone;
  record.reminderTimes = settings?.reminderTimes || record.reminderTimes;
  record.snapshot = summary || record.snapshot;
  saveData();
  res.json({ ok: true });
});
app.post("/api/push/unsubscribe", (req, res) => {
  delete data.subscriptions[req.body?.endpoint];
  saveData();
  res.json({ ok: true });
});
app.post("/api/push/test", async (req, res) => {
  const record = data.subscriptions[req.body?.endpoint];
  if (!record) return res.status(404).json({ error: "Subscription not found." });
  try {
    const [title, message] = randomMessage();
    await webpush.sendNotification(record.subscription, JSON.stringify({ title: `${title} (test)`, body: `${message} ${snapshotLine(record.snapshot)}` }));
    res.json({ ok: true });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

if (runtimeConfig.vapidPublicKey && runtimeConfig.vapidPrivateKey) {
  const vapidSubject = runtimeConfig.vapidSubject?.includes(":")
    ? runtimeConfig.vapidSubject
    : `mailto:${runtimeConfig.vapidSubject}`;
  webpush.setVapidDetails(vapidSubject || "mailto:you@example.com", runtimeConfig.vapidPublicKey, runtimeConfig.vapidPrivateKey);
} else {
  console.warn("[fernweh] VAPID keys are missing. Add them to frontend/push-config.js.");
}

app.listen(PORT, () => console.log(`[fernweh] app and push service listening on port ${PORT}`));
setInterval(sendDueNotifications, 60 * 1000);