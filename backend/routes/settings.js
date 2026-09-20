import { Router } from "express";
import db from "../db.js";

const router = Router();

function rowToSettings(row) {
  return {
    monthlyIncome: row.monthly_income,
    savingGoalName: row.saving_goal_name,
    savingGoalAmount: row.saving_goal_amount,
    savingGoalSaved: row.saving_goal_saved,
    savingGoalTargetDate: row.saving_goal_target_date,
    dailySpendLimit: row.daily_spend_limit,
    extraSpendThreshold: row.extra_spend_threshold,
    reminderTimes: JSON.parse(row.reminder_times || "[]"),
    timezone: row.timezone,
  };
}

router.get("/", (req, res) => {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  res.json(rowToSettings(row));
});

router.put("/", (req, res) => {
  const {
    monthlyIncome,
    savingGoalName,
    savingGoalAmount,
    savingGoalSaved,
    savingGoalTargetDate,
    dailySpendLimit,
    extraSpendThreshold,
    reminderTimes,
    timezone,
  } = req.body;

  const current = db.prepare("SELECT * FROM settings WHERE id = 1").get();

  db.prepare(
    `UPDATE settings SET
      monthly_income = ?,
      saving_goal_name = ?,
      saving_goal_amount = ?,
      saving_goal_saved = ?,
      saving_goal_target_date = ?,
      daily_spend_limit = ?,
      extra_spend_threshold = ?,
      reminder_times = ?,
      timezone = ?
     WHERE id = 1`
  ).run(
    monthlyIncome ?? current.monthly_income,
    savingGoalName ?? current.saving_goal_name,
    savingGoalAmount ?? current.saving_goal_amount,
    savingGoalSaved ?? current.saving_goal_saved,
    savingGoalTargetDate ?? current.saving_goal_target_date,
    dailySpendLimit ?? current.daily_spend_limit,
    extraSpendThreshold ?? current.extra_spend_threshold,
    reminderTimes ? JSON.stringify(reminderTimes) : current.reminder_times,
    timezone ?? current.timezone
  );

  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  res.json(rowToSettings(row));
});

export default router;
