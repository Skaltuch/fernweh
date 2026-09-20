import { Router } from "express";
import db from "../db.js";

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

router.get("/summary", (req, res) => {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  const today = todayStr();
  const monthStart = monthStartStr();

  const todaySpentRow = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date = ?")
    .get(today);
  const todaySpent = todaySpentRow.total;

  const monthSpentRow = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date >= ?")
    .get(monthStart);
  const monthSpent = monthSpentRow.total;

  // Daily totals for the last 30 days (for the trend chart + streak calc)
  const dailyTotals = db
    .prepare(
      `SELECT date, SUM(amount) AS total FROM expenses
       WHERE date >= date('now', '-29 days')
       GROUP BY date ORDER BY date ASC`
    )
    .all();

  const dailyMap = new Map(dailyTotals.map((r) => [r.date, r.total]));
  const limit = settings.daily_spend_limit;

  // Build a full 30-day series, filling zero-spend days
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, spent: dailyMap.get(key) || 0 });
  }

  // Current streak of consecutive days (ending today) at or under the daily limit
  let streak = 0;
  if (limit > 0) {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].spent <= limit) streak++;
      else break;
    }
  }

  const daysOverLimit =
    limit > 0 ? series.filter((s) => s.spent > limit).length : 0;

  const daysElapsedThisMonth = new Date().getDate();
  const avgDailySpendThisMonth = monthSpent / daysElapsedThisMonth;

  // Spend by category, last 30 days
  const byCategoryRows = db
    .prepare(
      `SELECT category, SUM(amount) AS total FROM expenses
       WHERE date >= date('now', '-29 days')
       GROUP BY category ORDER BY total DESC`
    )
    .all();

  const projectedMonthSpend =
    avgDailySpendThisMonth * new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();

  const projectedMonthSavings = settings.monthly_income - projectedMonthSpend;

  const goalRemaining = Math.max(
    settings.saving_goal_amount - settings.saving_goal_saved,
    0
  );
  const goalProgressPct =
    settings.saving_goal_amount > 0
      ? Math.min(
          (settings.saving_goal_saved / settings.saving_goal_amount) * 100,
          100
        )
      : 0;

  res.json({
    today: {
      date: today,
      spent: todaySpent,
      limit,
      remaining: limit - todaySpent,
      overLimit: limit > 0 && todaySpent > limit,
      overThreshold:
        settings.extra_spend_threshold > 0 &&
        todaySpent > settings.extra_spend_threshold,
    },
    month: {
      spent: monthSpent,
      income: settings.monthly_income,
      avgDailySpend: Number(avgDailySpendThisMonth.toFixed(2)),
      projectedSpend: Number(projectedMonthSpend.toFixed(2)),
      projectedSavings: Number(projectedMonthSavings.toFixed(2)),
    },
    streakDaysUnderLimit: streak,
    daysOverLimitLast30: daysOverLimit,
    trend: series,
    byCategory: byCategoryRows,
    goal: {
      name: settings.saving_goal_name,
      amount: settings.saving_goal_amount,
      saved: settings.saving_goal_saved,
      remaining: goalRemaining,
      progressPct: Number(goalProgressPct.toFixed(1)),
      targetDate: settings.saving_goal_target_date,
    },
  });
});

export default router;
