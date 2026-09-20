import { useState } from "react";
import { money } from "../format.js";

const CATEGORIES = ["Food", "Transport", "Coffee", "Shopping", "Bills", "Fun", "Other"];

export default function DailySpend({ expenses, onAdd, onDelete }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setBusy(true);
    try {
      await onAdd({ amount: value, category, note: note.trim() || undefined });
      setAmount("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Today's spending</h2>
      <form className="expense-form" onSubmit={submit}>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          Add
        </button>
      </form>

      {expenses.length === 0 ? (
        <p className="empty-state">Nothing logged yet today. Add your first spend above.</p>
      ) : (
        <ul className="expense-list">
          {expenses.map((exp) => (
            <li key={exp.id}>
              <div className="expense-info">
                <span className="expense-note">{exp.note || exp.category}</span>
                <span className="expense-category">{exp.category}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span className="expense-amount">{money(exp.amount)}</span>
                <button className="expense-delete" onClick={() => onDelete(exp.id)}>
                  remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { CATEGORIES };
