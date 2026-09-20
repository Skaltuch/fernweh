import cron from "node-cron";
import webpush from "web-push";
import db from "../db.js";
import { getRandomQuote } from "../quotes.js";

function currentHHMMInTz(timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour").value;
    const m = parts.find((p) => p.type === "minute").value;
    return `${h}:${m}`;
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

async function broadcast(payload) {
  const subs = db.prepare("SELECT * FROM push_subscriptions").all();
  if (subs.length === 0) return;
  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(JSON.parse(s.subscription), body).catch((err) => {
        // Prune subscriptions the browser/OS has revoked
        if (err.statusCode === 404 || err.statusCode === 410) {
          db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(s.endpoint);
        }
      })
    )
  );
}

// Runs once a minute. A given "HH:MM slot on a given date" only ever fires
// once, tracked in sent_reminders, so restarts / double ticks can't double-send.
export function startReminderScheduler() {
  cron.schedule("* * * * *", async () => {
    const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    const reminderTimes = JSON.parse(settings.reminder_times || "[]");
    if (reminderTimes.length === 0) return;

    const nowHHMM = currentHHMMInTz(settings.timezone);
    if (!reminderTimes.includes(nowHHMM)) return;

    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: settings.timezone || "UTC",
    }).format(new Date()); // en-CA gives YYYY-MM-DD
    const slot = `${todayLocal} ${nowHHMM}`;

    const already = db.prepare("SELECT slot FROM sent_reminders WHERE slot = ?").get(slot);
    if (already) return;
    db.prepare("INSERT INTO sent_reminders (slot) VALUES (?)").run(slot);

    const todaySpentRow = db
      .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date = ?")
      .get(todayLocal);
    const spent = todaySpentRow.total;
    const limit = settings.daily_spend_limit;

    let title = "Fernweh";
    let body;
    if (limit > 0 && spent > limit) {
      body = `You've spent ${spent.toFixed(2)} today, over your ${limit.toFixed(2)} limit. ${getRandomQuote()}`;
    } else if (limit > 0) {
      body = `Spent ${spent.toFixed(2)} of your ${limit.toFixed(2)} daily limit so far. ${getRandomQuote()}`;
    } else {
      body = getRandomQuote();
    }

    await broadcast({ title, body });
  });
}
