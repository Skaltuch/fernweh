const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getSettings: () => request("/settings"),
  updateSettings: (data) =>
    request("/settings", { method: "PUT", body: JSON.stringify(data) }),

  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/expenses${qs ? `?${qs}` : ""}`);
  },
  addExpense: (data) =>
    request("/expenses", { method: "POST", body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),

  getSummary: () => request("/metrics/summary"),

  getVapidPublicKey: () => request("/push/vapid-public-key"),
  subscribePush: (subscription) =>
    request("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint) =>
    request("/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  testPush: () => request("/push/test", { method: "POST" }),
};
