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
} from "recharts";

function fmtDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function MetricsDashboard({ summary, view = "all" }) {
  if (!summary) return null;

  const trendData = summary.trend.map((t) => ({ ...t, label: fmtDay(t.date) }));
  const categoryData = summary.byCategory.map((c) => ({
    name: c.category,
    total: Number(c.total.toFixed(2)),
  }));

  return (
    <>
      {view === "goal" && (
        <div className="card goal-card">
          <div className="goal-orb"><strong>{summary.goal.progressPct}%</strong><span>funded</span></div>
          <div className="goal-detail">
            <div className="goal-row">
              <span className="goal-name">{summary.goal.saved.toFixed(0)} / {summary.goal.amount.toFixed(0)}</span>
              <span className="goal-pct">{summary.goal.progressPct}%</span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${summary.goal.progressPct}%` }} /></div>
            <p className="card-meta">
              {summary.goal.remaining > 0
                ? `${summary.goal.remaining.toFixed(0)} to go${summary.goal.targetDate ? ` by ${summary.goal.targetDate}` : ""}.`
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
            <div className="value">{summary.month.spent.toFixed(0)}</div>
            <div className="label">spent so far</div>
          </div>
          <div className="metric-tile">
            <div className="value">{summary.month.avgDailySpend.toFixed(0)}</div>
            <div className="label">avg / day</div>
          </div>
          <div className="metric-tile">
            <div className="value">{summary.month.projectedSavings.toFixed(0)}</div>
            <div className="label">projected savings</div>
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
            <div className="value">{summary.month.projectedSpend.toFixed(0)}</div>
            <div className="label">projected month spend</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Last 30 days</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#cbd8d0" vertical={false} />
            <XAxis
              dataKey="label"
              interval={4}
              tick={{ fill: "#687b75", fontSize: 11 }}
              axisLine={{ stroke: "#cbd8d0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#687b75", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "#f7fbf6",
                border: "1px solid #cbd8d0",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#687b75" }}
            />
            <Line
              type="monotone"
              dataKey="spent"
              stroke="#e47b4f"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {categoryData.length > 0 && (
        <div className="card">
          <h2>By category (30d)</h2>
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
                tick={{ fill: "#8FA3BF", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "#f7fbf6",
                  border: "1px solid #cbd8d0",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(228,123,79,0.08)" }}
              />
              <Bar dataKey="total" fill="#e47b4f" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2>{summary.goal.name}</h2>
        <div className="goal-row">
          <span className="goal-name">
            {summary.goal.saved.toFixed(0)} / {summary.goal.amount.toFixed(0)}
          </span>
          <span className="goal-pct">{summary.goal.progressPct}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${summary.goal.progressPct}%` }} />
        </div>
        <p className="card-meta" style={{ marginTop: 10 }}>
          {summary.goal.remaining > 0
            ? `${summary.goal.remaining.toFixed(0)} to go${
                summary.goal.targetDate ? ` by ${summary.goal.targetDate}` : ""
              }.`
            : "Goal reached — time to book it."}
        </p>
      </div>
      </>}
    </>
  );
}
