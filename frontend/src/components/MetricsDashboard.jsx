import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { money } from "../format.js";

function fmtDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--panel-solid)",
    border: "1px solid var(--hairline)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--text)",
  },
  labelStyle: { color: "var(--text-muted)" },
};

export default function MetricsDashboard({ summary, view = "all" }) {
  if (!summary) return null;

  const trendData = summary.trend.map((t) => ({ ...t, label: fmtDay(t.date) }));
  const categoryData = summary.byCategory.slice(0, 8).map((c) => ({
    name: c.category,
    total: Number(c.total.toFixed(2)),
  }));
  const weekdayData = (summary.byWeekday || []).map((w) => ({ ...w, avg: Number(w.avg.toFixed(2)) }));

  return (
    <>
      {view === "goal" && (
        <div className="card goal-card">
          <div className="goal-orb"><strong>{summary.goal.progressPct}%</strong><span>funded</span></div>
          <div className="goal-detail">
            <div className="goal-row">
              <span className="goal-name">{money(summary.goal.saved)} / {money(summary.goal.amount)}</span>
              <span className="goal-pct">{summary.goal.progressPct}%</span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${summary.goal.progressPct}%` }} /></div>
            <p className="card-meta">
              {summary.goal.remaining > 0
                ? `${money(summary.goal.remaining)} to go${summary.goal.targetDate ? ` by ${summary.goal.targetDate}` : ""}.`
                : "Goal reached - time to book it."}
            </p>
          </div>
        </div>
      )}

      {(view === "trends" || view === "all") && <>
      <div className="card">
        <h2>This month</h2>
        <div className="metrics-grid">
          <div className="metric-tile">
            <div className="value">{money(summary.month.spent, { compact: true })}</div>
            <div className="label">spent so far</div>
          </div>
          <div className="metric-tile">
            <div className="value">{money(summary.month.avgDailySpend, { compact: true })}</div>
            <div className="label">avg / day</div>
          </div>
          <div className="metric-tile">
            <div className="value">{money(summary.month.fixedSavings, { compact: true })}</div>
            <div className="label">fixed savings</div>
          </div>
          <div className="metric-tile">
            <div className="value">{summary.streakDaysUnderLimit}</div>
            <div className="label">day streak under limit</div>
          </div>
          <div className="metric-tile">
            <div className="value">{summary.daysOverLimitLast30}</div>
            <div className="label">days over limit (30d)</div>
          </div>
          <div className="metric-tile">
            <div className="value">{money(summary.month.availableAfterSavings, { compact: true })}</div>
            <div className="label">available after savings</div>
          </div>
        </div>
      </div>

      <div className="card portfolio-card">
        <h2>Income vs. spend</h2>
        <div className="portfolio-bars">
          <div className="portfolio-row">
            <span>Income</span>
            <div className="portfolio-track"><div className="portfolio-fill income" style={{ width: "100%" }} /></div>
            <strong>{money(summary.month.income, { compact: true })}</strong>
          </div>
          <div className="portfolio-row">
            <span>Spent</span>
            <div className="portfolio-track">
              <div
                className="portfolio-fill spend"
                style={{ width: `${summary.month.income > 0 ? Math.min((summary.month.spent / summary.month.income) * 100, 100) : 0}%` }}
              />
            </div>
            <strong>{money(summary.month.spent, { compact: true })}</strong>
          </div>
          <div className="portfolio-row">
            <span>Savings target</span>
            <div className="portfolio-track">
              <div
                className="portfolio-fill savings"
                style={{ width: `${summary.month.income > 0 ? Math.min((summary.month.fixedSavings / summary.month.income) * 100, 100) : 0}%` }}
              />
            </div>
            <strong>{money(summary.month.fixedSavings, { compact: true })}</strong>
          </div>
        </div>
        <p className="card-meta" style={{ marginTop: 12 }}>
          Savings rate this month: <strong className={summary.savingsRate < 0 ? "over" : ""}>{summary.savingsRate.toFixed(0)}%</strong> of income
        </p>
      </div>

      <div className="card">
        <h2>Last 30 days</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={4}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--hairline)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip {...tooltipStyle} />
            <Line
              type="monotone"
              dataKey="spent"
              stroke="var(--gold)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {(summary.bestDay || summary.worstDay) && (
          <div className="best-worst-row">
            {summary.bestDay && (
              <div className="best-worst-tile good">
                <span>Lightest day</span>
                <strong>{money(summary.bestDay.total, { compact: true })}</strong>
                <small>{fmtDay(summary.bestDay.date)}</small>
              </div>
            )}
            {summary.worstDay && (
              <div className="best-worst-tile bad">
                <span>Heaviest day</span>
                <strong>{money(summary.worstDay.total, { compact: true })}</strong>
                <small>{fmtDay(summary.worstDay.date)}</small>
              </div>
            )}
          </div>
        )}
      </div>

      {weekdayData.some((w) => w.avg > 0) && (
        <div className="card">
          <h2>Average spend by weekday</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekdayData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {weekdayData.map((entry, i) => (
                  <Cell key={i} fill="var(--gold)" opacity={0.55 + (entry.avg / Math.max(...weekdayData.map((w) => w.avg), 1)) * 0.45} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="card">
          <h2>Top reasons (30d)</h2>
          <ResponsiveContainer width="100%" height={Math.max(120, categoryData.length * 34)}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={92}
              />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,180,87,0.08)" }} />
              <Bar dataKey="total" fill="var(--gold)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2>{summary.goal.name}</h2>
        <div className="goal-row">
          <span className="goal-name">
            {money(summary.goal.saved)} / {money(summary.goal.amount)}
          </span>
          <span className="goal-pct">{summary.goal.progressPct}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${summary.goal.progressPct}%` }} />
        </div>
        <p className="card-meta" style={{ marginTop: 10 }}>
          {summary.goal.remaining > 0
            ? `${money(summary.goal.remaining)} to go${
                summary.goal.targetDate ? ` by ${summary.goal.targetDate}` : ""
              }.`
            : "Goal reached — time to book it."}
        </p>
      </div>
      </>}
    </>
  );
}
