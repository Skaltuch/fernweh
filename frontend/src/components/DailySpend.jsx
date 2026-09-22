import { useEffect, useState } from "react";
import { money } from "../format.js";
import { api } from "../api.js";

export default function DailySpend({ expenses, onAdd, onUpdate, onDelete, title = "Today's spending" }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ amount: "", reason: "" });

  useEffect(() => {
    api.getReasonSuggestions().then(setSuggestions).catch(() => {});
  }, [expenses]);

  async function submit(e) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setBusy(true);
    try {
      await onAdd({ amount: value, category: reason.trim() || "Uncategorized" });
      setAmount("");
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(exp) {
    setEditingId(exp.id);
    setEditDraft({ amount: String(exp.amount), reason: exp.category || "" });
  }

  async function saveEdit(id) {
    const value = parseFloat(editDraft.amount);
    if (!value || value <= 0) return;
    await onUpdate(id, { amount: value, category: editDraft.reason.trim() || "Uncategorized" });
    setEditingId(null);
  }

  return (
    <div className="card spend-card">
      <h2>{title}</h2>
      <form className="expense-form" onSubmit={submit}>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          type="text"
          className="reason-input"
          placeholder="What was it for?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          list="reason-suggestions"
        />
        <datalist id="reason-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="submit" disabled={busy}>
          Add
        </button>
      </form>

      {expenses.length === 0 ? (
        <p className="empty-state">Nothing logged for this day yet.</p>
      ) : (
        <ul className="expense-list">
          {expenses.map((exp) => (
            <li key={exp.id} className={editingId === exp.id ? "editing" : ""}>
              {editingId === exp.id ? (
                <div className="expense-edit-row">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={editDraft.amount}
                    onChange={(e) => setEditDraft((d) => ({ ...d, amount: e.target.value }))}
                  />
                  <input
                    type="text"
                    value={editDraft.reason}
                    onChange={(e) => setEditDraft((d) => ({ ...d, reason: e.target.value }))}
                    list="reason-suggestions"
                  />
                  <div className="expense-edit-actions">
                    <button type="button" className="btn-ghost sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary sm" onClick={() => saveEdit(exp.id)}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button className="expense-info" onClick={() => startEdit(exp)}>
                    <span className="expense-note">{exp.category || "Uncategorized"}</span>
                    <span className="expense-category">{exp.date}</span>
                  </button>
                  <div className="expense-right">
                    <span className="expense-amount">{money(exp.amount)}</span>
                    <button className="expense-delete" onClick={() => onDelete(exp.id)} aria-label="Delete expense">
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
