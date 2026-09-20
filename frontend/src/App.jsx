import { useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import SettingsForm from "./components/SettingsForm.jsx";
import DailySpend from "./components/DailySpend.jsx";
import MetricsDashboard from "./components/MetricsDashboard.jsx";
import NotificationSetup from "./components/NotificationSetup.jsx";
import { money } from "./format.js";

const QUOTES = [
  "A clear budget gives every dinar a job.",
  "You are building a calmer relationship with money.",
  "One steady choice today makes tomorrow easier.",
  "Progress does not need to be perfect to count.",
  "Your goal gets stronger every time you check in.",
  "Small decisions become meaningful results.",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const refresh = useCallback(async () => {
    const [s, sum, exp] = await Promise.all([
      api.getSettings(),
      api.getSummary(),
      api.getExpenses({ date: todayStr() }),
    ]);
    setSettings(s);
    setSummary(sum);
    setTodayExpenses(exp);
    const endpoint = localStorage.getItem("fernweh.pushEndpoint");
    if (endpoint) {
      api.syncPushSnapshot({ endpoint, settings: s, summary: sum }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!loading && settings && settings.dailySpendLimit === 0 && settings.monthlyIncome === 0) {
      setShowSettings(true);
    }
  }, [loading, settings]);

  async function handleAddExpense(data) {
    await api.addExpense(data);
    await refresh();
  }

  async function handleDeleteExpense(id) {
    await api.deleteExpense(id);
    await refresh();
  }

  async function handleSaveSettings(data) {
    await api.updateSettings(data);
    await refresh();
  }

  async function handleImportData(data) {
    await api.importData(data);
    await refresh();
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8FA3BF" }}>
        Loading Skaltuchet…
      </div>
    );
  }

  const todaySpent = summary?.today.spent ?? 0;
  const limit = summary?.today.limit ?? 0;
  const remaining = summary?.today.remaining ?? 0;
  const overLimit = summary?.today.overLimit;
  const pct = limit > 0 ? Math.min((todaySpent / limit) * 100, 100) : 0;
  const navItems = [
    { id: "home", label: "Today", icon: "⌂" },
    { id: "trends", label: "Insights", icon: "⌁" },
    { id: "goal", label: "Goal", icon: "◌" },
  ];

  return (
    <>
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">↗</span>
          <div>
            <div className="eyebrow">Personal money system</div>
            <h1>Skaltuchet</h1>
            <div className="tagline">clear choices, steady progress</div>
          </div>
        </div>
        <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Open budget settings">
          <span aria-hidden="true">◒</span>
          Budget
        </button>
      </header>

      <main className="page-shell">
        {activePage === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="label">
                  {limit > 0 ? "Left to spend today" : "Set a daily limit to see this"}
                </div>
                <p className={`amount ${overLimit ? "over" : "under"}`}>
                  {limit > 0 ? money(remaining) : money(todaySpent)}
                </p>
                <div className="sub">
                  {limit > 0
                    ? `${money(todaySpent)} spent of ${money(limit)} limit`
                    : `${money(todaySpent)} spent today`}
                </div>
                {limit > 0 && (
                  <div className="bar-track">
                    <div className={`bar-fill ${overLimit ? "over" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <div className="hero-orbit" aria-hidden="true">
                <span>MONTHLY SAVINGS</span>
                <strong>{money(summary?.month.fixedSavings ?? 0, { compact: true })}</strong>
                <small>{summary?.month.savingsSettled ? "settled by you" : "set your amount"}</small>
              </div>
            </section>

            <section className="budget-status-grid" aria-label="Today's budget status">
              <div className="status-panel">
                <span>Daily limit</span>
                <strong>{money(limit)}</strong>
                <small>{limit > 0 ? `${money(Math.max(remaining, 0))} remaining` : "Set a limit"}</small>
              </div>
              <div className={`status-panel ${summary?.today.thresholdReached ? "status-alert" : ""}`}>
                <span>Extra threshold</span>
                <strong>{summary?.today.threshold > 0 ? money(summary.today.threshold) : "Not set"}</strong>
                <small>{summary?.today.threshold > 0
                  ? summary.today.thresholdReached ? "Reached today" : `${money(Math.max(summary.today.thresholdRemaining, 0))} remaining`
                  : "Set a threshold"}</small>
              </div>
            </section>

            <p className="quote-banner">{quote}</p>

            <DailySpend
              expenses={todayExpenses}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
            />

            <section className="quick-stats">
              <div><strong>{money(summary?.month.spent ?? 0, { compact: true })}</strong><span>month spend</span></div>
              <div><strong>{summary?.streakDaysUnderLimit ?? 0}</strong><span>day streak</span></div>
              <div><strong>{money(summary?.month.avgDailySpend ?? 0, { compact: true })}</strong><span>daily average</span></div>
            </section>
          </>
        )}

        {activePage === "trends" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">Your money, in motion</span>
              <h2>Spending insights</h2>
              <p>Find the patterns that move your goal closer.</p>
            </div>
            <MetricsDashboard summary={summary} view="trends" />
          </section>
        )}

        {activePage === "goal" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">The reason behind the numbers</span>
              <h2>{summary?.goal.name ?? "Your next adventure"}</h2>
              <p>Small choices today build the result you want.</p>
            </div>
            <MetricsDashboard summary={summary} view="goal" />
          </section>
        )}
      </main>

      <NotificationSetup />

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activePage === item.id ? "active" : ""}
            onClick={() => setActivePage(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {showSettings && settings && (
        <SettingsForm
          settings={settings}
          onSave={handleSaveSettings}
          onImport={handleImportData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
