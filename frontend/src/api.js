const SETTINGS_KEY = "fernweh.settings";
const EXPENSES_KEY = "fernweh.expenses";

const DEFAULT_SETTINGS = {
  monthlyIncome: 0,
  savingGoalName: "My goal",
  savingGoalAmount: 0,
  savingGoalSaved: 0,
  monthlySavingsTarget: 0,
  savingGoalTargetDate: null,
  dailySpendLimit: 0,
  extraSpendThreshold: 0,
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function dateOffset(days) {
  const date = new Date(`${today()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getExpenses() {
  return read(EXPENSES_KEY, []).map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
  }));
}

function sum(expenses) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

function buildSummary() {
  const settings = read(SETTINGS_KEY, DEFAULT_SETTINGS);
  const expenses = getExpenses();
  const currentDay = today();
  const monthStart = `${currentDay.slice(0, 7)}-01`;
  const todayExpenses = expenses.filter((expense) => expense.date === currentDay);
  const monthExpenses = expenses.filter((expense) => expense.date >= monthStart && expense.date <= currentDay);
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = dateOffset(index - 29);
    return { date, spent: sum(expenses.filter((expense) => expense.date === date)) };
  });
  const categoryTotals = {};
  expenses.filter((expense) => expense.date >= dateOffset(-29) && expense.date <= currentDay).forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });
  const activeDays = new Set(monthExpenses.map((expense) => expense.date)).size || 1;
  const dailyLimit = Number(settings.dailySpendLimit) || 0;
  const threshold = Number(settings.extraSpendThreshold) || 0;
  const todaySpent = sum(todayExpenses);
  let streakDaysUnderLimit = 0;
  for (let index = 0; index < 30; index += 1) {
    const day = dateOffset(-index);
    const spent = sum(expenses.filter((expense) => expense.date === day));
    if (dailyLimit > 0 && spent <= dailyLimit) streakDaysUnderLimit += 1;
    else break;
  }
  const daysOverLimitLast30 = dailyLimit > 0
    ? trend.filter((point) => point.spent > dailyLimit).length
    : 0;
  const projectedSpend = monthExpenses.length ? (sum(monthExpenses) / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() : 0;
  const monthlyIncome = Number(settings.monthlyIncome) || 0;
  const monthlySavingsTarget = Number(settings.monthlySavingsTarget) || 0;
  const projectedSavings = monthlyIncome - projectedSpend;
  const goalAmount = Number(settings.savingGoalAmount) || 0;
  const goalSaved = Number(settings.savingGoalSaved) || 0;

  const last30 = expenses.filter((expense) => expense.date >= dateOffset(-29) && expense.date <= currentDay);
  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayTotals = WEEKDAY_LABELS.map(() => ({ total: 0, count: 0 }));
  last30.forEach((expense) => {
    const dow = new Date(`${expense.date}T00:00:00`).getDay();
    weekdayTotals[dow].total += expense.amount;
    weekdayTotals[dow].count += 1;
  });
  const byWeekday = WEEKDAY_LABELS.map((label, index) => ({
    day: label,
    avg: weekdayTotals[index].count ? weekdayTotals[index].total / weekdayTotals[index].count : 0,
  }));

  const dayTotalsMap = {};
  last30.forEach((expense) => {
    dayTotalsMap[expense.date] = (dayTotalsMap[expense.date] || 0) + expense.amount;
  });
  const dayTotalsList = Object.entries(dayTotalsMap).map(([date, total]) => ({ date, total }));
  const bestDay = dayTotalsList.length
    ? dayTotalsList.reduce((min, cur) => (cur.total < min.total ? cur : min))
    : null;
  const worstDay = dayTotalsList.length
    ? dayTotalsList.reduce((max, cur) => (cur.total > max.total ? cur : max))
    : null;

  const savingsRate = monthlyIncome > 0
    ? Math.max(Math.min(((monthlyIncome - sum(monthExpenses)) / monthlyIncome) * 100, 100), -100)
    : 0;

  return {
    today: {
      spent: todaySpent,
      limit: dailyLimit,
      remaining: dailyLimit - todaySpent,
      overLimit: dailyLimit > 0 && todaySpent > dailyLimit,
      threshold,
      thresholdRemaining: threshold - todaySpent,
      thresholdReached: threshold > 0 && todaySpent >= threshold,
    },
    month: {
      spent: sum(monthExpenses),
      avgDailySpend: sum(monthExpenses) / activeDays,
      projectedSavings,
      projectedSpend,
      income: monthlyIncome,
      fixedSavings: monthlySavingsTarget,
      availableAfterSavings: monthlyIncome - monthlySavingsTarget - sum(monthExpenses),
      savingsSettled: monthlySavingsTarget > 0,
      monthKey: monthStart.slice(0, 7),
    },
    streakDaysUnderLimit,
    daysOverLimitLast30,
    trend,
    byCategory: Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
    byWeekday,
    bestDay,
    worstDay,
    savingsRate,
    goal: {
      name: settings.savingGoalName || "My goal",
      amount: goalAmount,
      saved: goalSaved,
      remaining: Math.max(goalAmount - goalSaved, 0),
      progressPct: goalAmount > 0 ? Math.min(Math.round((goalSaved / goalAmount) * 100), 100) : 0,
      targetDate: settings.savingGoalTargetDate,
    },
  };
}

export const api = {
  getSettings: async () => read(SETTINGS_KEY, DEFAULT_SETTINGS),
  updateSettings: async (data) => write(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...data }),
  exportData: async () => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: read(SETTINGS_KEY, DEFAULT_SETTINGS),
    expenses: getExpenses(),
  }),
  importData: async (data) => {
    if (!data || typeof data !== "object" || !Array.isArray(data.expenses) || !data.settings) {
      throw new Error("This is not a valid Skaltuchet backup file.");
    }
    write(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...data.settings });
    write(EXPENSES_KEY, data.expenses.map((expense) => ({
      ...expense,
      id: expense.id || crypto.randomUUID(),
      amount: Number(expense.amount),
    })));
  },
  getExpenses: async (params = {}) => getExpenses().filter((expense) =>
    (!params.date || expense.date === params.date) &&
    (!params.from || expense.date >= params.from) &&
    (!params.to || expense.date <= params.to)
  ),
  addExpense: async (data) => {
    const expense = { id: crypto.randomUUID(), date: data.date || today(), ...data, amount: Number(data.amount) };
    write(EXPENSES_KEY, [...getExpenses(), expense]);
    return expense;
  },
  updateExpense: async (id, data) => {
    const expenses = getExpenses().map((expense) =>
      expense.id === id ? { ...expense, ...data, amount: Number(data.amount ?? expense.amount) } : expense
    );
    write(EXPENSES_KEY, expenses);
    return expenses.find((expense) => expense.id === id);
  },
  deleteExpense: async (id) => write(EXPENSES_KEY, getExpenses().filter((expense) => expense.id !== id)),
  getSummary: async () => buildSummary(),
  getReasonSuggestions: async () => {
    const counts = {};
    getExpenses().forEach((expense) => {
      const reason = (expense.category || "").trim();
      if (reason) counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([reason]) => reason);
  },
  getActiveDays: async () => {
    const byDate = {};
    getExpenses().forEach((expense) => {
      byDate[expense.date] = (byDate[expense.date] || 0) + expense.amount;
    });
    return Object.entries(byDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  today,
};
