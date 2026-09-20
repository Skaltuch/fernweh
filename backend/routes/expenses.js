import { Router } from "express";
import webpush from "web-push";
import db from "../db.js";

const router = Router();

async function maybeAlertThreshold(day) {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (!settings.extra_spend_threshold || settings.extra_spend_threshold <= 0) return;

  const totalRow = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date = ?")
    .get(day);

  if (totalRow.total <= settings.extra_spend_threshold) return;

  const subs = db.prepare("SELECT * FROM push_subscriptions").all();
  const payload = JSON.stringify({
    title: "Fernweh — over threshold",
    body: `Today's spending just passed ${settings.extra_spend_threshold.toFixed(2)}. Total so far: ${totalRow.total.toFixed(2)}.`,
  });
  await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(JSON.parse(s.subscription), payload))
  );
}

// GET /api/expenses?date=YYYY-MM-DD           -> one day
// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD -> range
// GET /api/expenses                            -> last 90 days
router.get("/", (req, res) => {
  const { date, from, to } = req.query;

  let rows;
  if (date) {
    rows = db
      .prepare("SELECT * FROM expenses WHERE date = ? ORDER BY created_at DESC")
      .all(date);
  } else if (from && to) {
    rows = db
      .prepare(
        "SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC"
      )
      .all(from, to);
  } else {
    rows = db
      .prepare(
        "SELECT * FROM expenses WHERE date >= date('now', '-90 days') ORDER BY date DESC, created_at DESC"
      )
      .all();
  }

  res.json(rows);
});

router.post("/", (req, res) => {
  const { amount, category, note, date } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const day = date || new Date().toISOString().slice(0, 10);

  const result = db
    .prepare(
      "INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)"
    )
    .run(day, amount, category || "Other", note || null);

  const row = db.prepare("SELECT * FROM expenses WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);

  // Fire-and-forget: don't make the user wait on push delivery
  maybeAlertThreshold(day).catch(() => {});
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
