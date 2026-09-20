import { useState } from "react";

export default function SettingsForm({ settings, onSave, onClose }) {
  const [form, setForm] = useState({
    monthlyIncome: settings.monthlyIncome || "",
    savingGoalName: settings.savingGoalName || "",
    savingGoalAmount: settings.savingGoalAmount || "",
    savingGoalSaved: settings.savingGoalSaved || 0,
    savingGoalTargetDate: settings.savingGoalTargetDate || "",
    dailySpendLimit: settings.dailySpendLimit || "",
    extraSpendThreshold: settings.extraSpendThreshold || "",
    reminderTimes: settings.reminderTimes?.length ? settings.reminderTimes : ["09:00", "20:00"],
    timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addTime() {
    if (!newTime) return;
    if (!form.reminderTimes.includes(newTime)) {
      update("reminderTimes", [...form.reminderTimes, newTime].sort());
    }
    setNewTime("");
  }

  function removeTime(t) {
    update(
      "reminderTimes",
      form.reminderTimes.filter((x) => x !== t)
    );
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        monthlyIncome: parseFloat(form.monthlyIncome) || 0,
        savingGoalName: form.savingGoalName || "Trip to Europe",
        savingGoalAmount: parseFloat(form.savingGoalAmount) || 0,
        savingGoalSaved: parseFloat(form.savingGoalSaved) || 0,
        savingGoalTargetDate: form.savingGoalTargetDate || null,
        dailySpendLimit: parseFloat(form.dailySpendLimit) || 0,
        extraSpendThreshold: parseFloat(form.extraSpendThreshold) || 0,
        reminderTimes: form.reminderTimes,
        timezone: form.timezone,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <h2>Your budget</h2>
        <p className="modal-sub">This drives every limit, reminder, and metric in the app.</p>

        <form onSubmit={submit}>
          <div className="settings-grid">
            <div className="field">
              <label htmlFor="income">Monthly income</label>
              <input
                id="income"
                type="number"
                step="0.01"
                value={form.monthlyIncome}
                onChange={(e) => update("monthlyIncome", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="dailyLimit">Daily spending limit</label>
              <input
                id="dailyLimit"
                type="number"
                step="0.01"
                value={form.dailySpendLimit}
                onChange={(e) => update("dailySpendLimit", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="threshold">Extra-spend alert threshold</label>
              <input
                id="threshold"
                type="number"
                step="0.01"
                value={form.extraSpendThreshold}
                onChange={(e) => update("extraSpendThreshold", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="tz">Timezone</label>
              <input
                id="tz"
                type="text"
                value={form.timezone}
                onChange={(e) => update("timezone", e.target.value)}
              />
            </div>

            <div className="field full">
              <label htmlFor="goalName">Saving goal</label>
              <input
                id="goalName"
                type="text"
                placeholder="Trip to Europe"
                value={form.savingGoalName}
                onChange={(e) => update("savingGoalName", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="goalAmount">Goal amount</label>
              <input
                id="goalAmount"
                type="number"
                step="0.01"
                value={form.savingGoalAmount}
                onChange={(e) => update("savingGoalAmount", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="goalSaved">Already saved</label>
              <input
                id="goalSaved"
                type="number"
                step="0.01"
                value={form.savingGoalSaved}
                onChange={(e) => update("savingGoalSaved", e.target.value)}
              />
            </div>
            <div className="field full">
              <label htmlFor="goalDate">Target date (optional)</label>
              <input
                id="goalDate"
                type="date"
                value={form.savingGoalTargetDate || ""}
                onChange={(e) => update("savingGoalTargetDate", e.target.value)}
              />
            </div>

            <div className="field full">
              <label>Daily reminder times</label>
              <div className="reminder-times">
                {form.reminderTimes.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                    <button type="button" onClick={() => removeTime(t)} aria-label={`Remove ${t}`}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{ width: 110 }}
                />
                <button type="button" className="btn-ghost" onClick={addTime}>
                  Add time
                </button>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
