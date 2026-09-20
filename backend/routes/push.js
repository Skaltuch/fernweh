import { Router } from "express";
import webpush from "web-push";
import db from "../db.js";

const router = Router();

router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

router.post("/subscribe", (req, res) => {
  const subscription = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "invalid subscription" });
  }

  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, subscription)
     VALUES (?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET subscription = excluded.subscription`
  ).run(subscription.endpoint, JSON.stringify(subscription));

  res.status(201).json({ ok: true });
});

router.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
  res.status(204).end();
});

// Manual "send me one now" button for testing the setup end-to-end.
router.post("/test", async (req, res) => {
  const subs = db.prepare("SELECT * FROM push_subscriptions").all();
  const payload = JSON.stringify({
    title: "Fernweh",
    body: "This is a test reminder. Push notifications are working.",
  });

  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification(JSON.parse(s.subscription), payload))
  );

  res.json({
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
});

export default router;
