import { useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import SettingsForm from "./components/SettingsForm.jsx";
import DailySpend from "./components/DailySpend.jsx";
import MetricsDashboard from "./components/MetricsDashboard.jsx";
import NotificationSetup from "./components/NotificationSetup.jsx";

const QUOTES = [
  "Every euro you don't spend today is a step closer to that flight to Europe.",
  "You're not depriving yourself — you're funding a better memory.",
  "Future-you, sitting in a café abroad, says thank you.",
  "Discipline today is a plane ticket tomorrow.",
  "One boring day of restraint funds one unforgettable day away.",
  "The trip is real if you make it real. Check today's spend.",
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
        Loading Fernweh…
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
            <div className="eyebrow">Personal travel fund</div>
            <h1>Fernweh</h1>
            <div className="tagline">save now, wander later</div>
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
                  {limit > 0 ? remaining.toFixed(2) : todaySpent.toFixed(2)}
                </p>
                <div className="sub">
                  {limit > 0
                    ? `${todaySpent.toFixed(2)} spent of ${limit.toFixed(2)} limit`
                    : `${todaySpent.toFixed(2)} spent today`}
                </div>
                {limit > 0 && (
                  <div className="bar-track">
                    <div className={`bar-fill ${overLimit ? "over" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <div className="hero-orbit" aria-hidden="true">
                <span>TRIP FUND</span>
                <strong>{summary?.month.projectedSavings?.toFixed(0) ?? "0"}</strong>
                <small>projected savings</small>
              </div>
            </section>

            <p className="quote-banner">{quote}</p>

            <DailySpend
              expenses={todayExpenses}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
            />

            <section className="quick-stats">
              <div><strong>{summary?.month.spent.toFixed(0) ?? "0"}</strong><span>month spend</span></div>
              <div><strong>{summary?.streakDaysUnderLimit ?? 0}</strong><span>day streak</span></div>
              <div><strong>{summary?.month.avgDailySpend.toFixed(0) ?? "0"}</strong><span>daily average</span></div>
            </section>
          </>
        )}

        {activePage === "trends" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">Your money, in motion</span>
              <h2>Spending insights</h2>
              <p>Find the patterns that move your trip closer.</p>
            </div>
            <MetricsDashboard summary={summary} view="trends" />
          </section>
        )}

        {activePage === "goal" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">The reason behind the numbers</span>
              <h2>{summary?.goal.name ?? "Your next adventure"}</h2>
              <p>Small choices today become a place you have never been.</p>
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
