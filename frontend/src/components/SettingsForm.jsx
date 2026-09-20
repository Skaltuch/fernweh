import { useState } from "react";
import { api } from "../api.js";

export default function SettingsForm({ settings, onSave, onImport, onClose }) {
  const [form, setForm] = useState({
    monthlyIncome: settings.monthlyIncome || "",
    monthlySavingsTarget: settings.monthlySavingsTarget || "",
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
  const [backupMessage, setBackupMessage] = useState("");

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
        monthlySavingsTarget: parseFloat(form.monthlySavingsTarget) || 0,
        savingGoalName: form.savingGoalName || "My goal",
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

  async function exportBackup() {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skaltuchet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Backup downloaded.");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await onImport(data);
      setBackupMessage("Backup restored.");
    } catch (error) {
      setBackupMessage(error.message || "Could not restore that backup.");
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

            <div className="field full">
              <label htmlFor="monthlySavings">Fixed monthly savings (TND)</label>
              <input
                id="monthlySavings"
                type="number"
                min="0"
                step="0.001"
                value={form.monthlySavingsTarget}
                onChange={(e) => update("monthlySavingsTarget", e.target.value)}
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
                placeholder="My goal"
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

            <div className="field full backup-tools">
              <label>Local data backup</label>
              <p className="field-help">Save your settings and all previous spending days as a file.</p>
              <div className="backup-actions">
                <button type="button" className="btn-ghost" onClick={exportBackup}>
                  Download backup
                </button>
                <label className="btn-ghost file-button">
                  Restore backup
                  <input type="file" accept="application/json,.json" onChange={importBackup} />
                </label>
              </div>
              {backupMessage && <span className="backup-message">{backupMessage}</span>}
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
