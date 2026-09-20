import Database from "better-sqlite3";
import dotenv from "dotenv";
dotenv.config();

const db = new Database(process.env.DB_PATH || "./fernweh.db");
db.pragma("journal_mode = WAL");

// One row of app-wide settings (id is always 1)
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_income REAL NOT NULL DEFAULT 0,
    saving_goal_name TEXT NOT NULL DEFAULT 'Trip to Europe',
    saving_goal_amount REAL NOT NULL DEFAULT 0,
    saving_goal_saved REAL NOT NULL DEFAULT 0,
    saving_goal_target_date TEXT,
    daily_spend_limit REAL NOT NULL DEFAULT 0,
    extra_spend_threshold REAL NOT NULL DEFAULT 0,
    reminder_times TEXT NOT NULL DEFAULT '["09:00","20:00"]',
    timezone TEXT NOT NULL DEFAULT 'UTC'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,           -- YYYY-MM-DD
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    subscription TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Tracks which reminder slots ("YYYY-MM-DD HH:MM") already fired, so the
// once-a-minute cron check never double-sends.
db.exec(`
  CREATE TABLE IF NOT EXISTS sent_reminders (
    slot TEXT PRIMARY KEY
  );
`);

const existing = db.prepare("SELECT id FROM settings WHERE id = 1").get();
if (!existing) {
  db.prepare(
    `INSERT INTO settings (id, monthly_income, saving_goal_name, saving_goal_amount,
      saving_goal_saved, daily_spend_limit, extra_spend_threshold, reminder_times, timezone)
     VALUES (1, 0, 'Trip to Europe', 0, 0, 0, 0, '["09:00","20:00"]', 'UTC')`
  ).run();
}

export default db;
