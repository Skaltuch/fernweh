import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { money } from "../format.js";
import DailySpend from "./DailySpend.jsx";

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtLong(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtShort(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function SpendingHistory({ settings, refreshSignal, onRefresh }) {
  const todayStr = api.today();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dayExpenses, setDayExpenses] = useState([]);
  const [activeDays, setActiveDays] = useState([]);

  const limit = Number(settings?.dailySpendLimit) || 0;

  useEffect(() => {
    api.getActiveDays().then(setActiveDays).catch(() => {});
  }, [refreshSignal]);

  useEffect(() => {
    api.getExpenses({ date: selectedDate }).then(setDayExpenses).catch(() => {});
  }, [selectedDate, refreshSignal]);

  const recentChips = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => shiftDate(todayStr, -i));
  }, [todayStr]);

  const daySpent = dayExpenses.reduce((t, e) => t + e.amount, 0);
  const overLimit = limit > 0 && daySpent > limit;
  const isToday = selectedDate === todayStr;

  async function handleAdd(data) {
    await api.addExpense({ ...data, date: selectedDate });
    onRefresh();
  }
  async function handleUpdate(id, data) {
    await api.updateExpense(id, data);
    onRefresh();
  }
  async function handleDelete(id) {
    await api.deleteExpense(id);
    onRefresh();
  }

  return (
    <>
      <div className="card history-nav">
        <div className="history-daypick">
          <button
            className="day-arrow"
            onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            aria-label="Previous day"
          >
            ‹
          </button>
          <div className="history-day-label">
            <strong>{fmtLong(selectedDate)}</strong>
            {isToday && <span className="today-pill">Today</span>}
          </div>
          <button
            className="day-arrow"
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            disabled={selectedDate >= todayStr}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <input
          type="date"
          className="history-date-input"
          value={selectedDate}
          max={todayStr}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <div className="history-chip-row" role="tablist" aria-label="Jump to recent day">
          {recentChips.map((date) => {
            const entry = activeDays.find((d) => d.date === date);
            const spent = entry?.total ?? 0;
            const chipOver = limit > 0 && spent > limit;
            return (
              <button
                key={date}
                className={`day-chip ${date === selectedDate ? "active" : ""} ${chipOver ? "over" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="day-chip-date">{fmtShort(date)}</span>
                <span className="day-chip-amount">{spent > 0 ? money(spent, { compact: true }) : "—"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card history-summary">
        <div className="history-summary-row">
          <div>
            <span className="label">Spent that day</span>
            <strong className={overLimit ? "over" : ""}>{money(daySpent)}</strong>
          </div>
          {limit > 0 && (
            <div>
              <span className="label">Daily limit</span>
              <strong>{money(limit)}</strong>
            </div>
          )}
          <div>
            <span className="label">Entries</span>
            <strong>{dayExpenses.length}</strong>
          </div>
        </div>
        {limit > 0 && (
          <div className="bar-track">
            <div
              className={`bar-fill ${overLimit ? "over" : ""}`}
              style={{ width: `${Math.min((daySpent / limit) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      <DailySpend
        title="Entries for this day"
        expenses={dayExpenses}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </>
  );
}
