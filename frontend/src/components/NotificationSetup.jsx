import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function NotificationSetup() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const supported = "Notification" in window;

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const checkReminder = async () => {
      if (localStorage.getItem("fernweh.remindersEnabled") !== "true" || Notification.permission !== "granted") return;
      const settings = await api.getSettings();
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);
      const key = `fernweh.reminder.${now.toISOString().slice(0, 10)}.${time}`;
      if (settings.reminderTimes?.includes(time) && !localStorage.getItem(key)) {
        new Notification("Fernweh check-in", { body: "Take a moment to check today's spending." });
        localStorage.setItem(key, "true");
      }
    };
    const timer = window.setInterval(checkReminder, 30000);
    checkReminder();
    return () => window.clearInterval(timer);
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMessage("Notifications were blocked. Enable them in your browser or phone settings.");
        return;
      }
      localStorage.setItem("fernweh.remindersEnabled", "true");
      setMessage("Reminders are on while Fernweh is open in this browser.");
    } catch (err) {
      setMessage(`Couldn't enable notifications: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission !== "granted") {
        setMessage("Enable reminders first so the browser can show a test notification.");
        return;
      }
      new Notification("Fernweh", { body: "Your travel fund is waiting for you." });
      setMessage("Test notification sent.");
    } catch (err) {
      setMessage(`Test failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="card">
        <h2>Reminders</h2>
        <p className="card-meta">
          Browser notifications aren't supported here. Your budget still works offline on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Reminders</h2>
      <div className="notif-status" style={{ marginBottom: 12 }}>
        <span className={`dot ${permission === "granted" ? "on" : "off"}`} />
        {permission === "granted" ? "Browser reminders enabled" : "Reminders not set up yet"}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={enable} disabled={busy}>
          {permission === "granted" ? "Keep reminders enabled" : "Enable reminders"}
        </button>
        <button className="btn-ghost" onClick={sendTest} disabled={busy}>
          Send test
        </button>
      </div>
      {message && (
        <p className="card-meta" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
    </div>
  );
}
