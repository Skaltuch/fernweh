import { useEffect, useState } from "react";
import { api } from "../api.js";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const MESSAGE_BANK = [
  { title: "A little progress, Fernweh", messages: [
    "Future-you is going to love the choices you make today.",
    "You only need the next good choice. Your trip is built one decision at a time.",
  ] },
  { title: "Your future trip is calling", messages: [
    "Every amount you keep is buying a little more freedom later.",
    "Saving is not missing out. It is choosing a memory in advance.",
  ] },
  { title: "Good vibes, better plans", messages: [
    "Take a breath. You are doing better than yesterday's version of you.",
    "A quiet check-in now can make the rest of your day feel lighter.",
  ] },
];

function chooseMessage() {
  const group = MESSAGE_BANK[Math.floor(Math.random() * MESSAGE_BANK.length)];
  return { title: group.title, message: group.messages[Math.floor(Math.random() * group.messages.length)] };
}

function spendLine(summary) {
  const spent = summary?.today?.spent?.toFixed(2) ?? "0.00";
  const limit = summary?.today?.limit ?? 0;
  if (!limit) return `You have spent ${spent} today. Set a daily limit to make your next check-in smarter.`;
  return summary.today.overLimit
    ? `You have spent ${spent} today and are ${Math.abs(summary.today.remaining).toFixed(2)} over your limit.`
    : `You have ${Math.max(summary.today.remaining, 0).toFixed(2)} left to spend today (${spent} of ${limit.toFixed(2)} used).`;
}

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener("ended", () => context.close());
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
}

export default function NotificationSetup() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [enabled, setEnabled] = useState(() => localStorage.getItem("fernweh.remindersEnabled") === "true");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supported = "Notification" in window;

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const checkReminder = async () => {
      if (localStorage.getItem("fernweh.remindersEnabled") !== "true" || Notification.permission !== "granted") return;
      const [settings, summary] = await Promise.all([api.getSettings(), api.getSummary()]);
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = now.toTimeString().slice(0, 5);
      const nowMs = now.getTime();
      const lastTwoHour = Number(localStorage.getItem("fernweh.lastTwoHourReminder") || 0);
      const scheduledKey = `fernweh.reminder.scheduled.${date}.${time}`;
      const dueScheduled = settings.reminderTimes?.includes(time) && !localStorage.getItem(scheduledKey);
      const dueTwoHour = nowMs - lastTwoHour >= TWO_HOURS;
      if (!dueScheduled && !dueTwoHour) return;

      const selected = chooseMessage();
      new Notification(selected.title, {
        body: `${selected.message} ${spendLine(summary)}`,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: dueScheduled ? `fernweh-scheduled-${time}` : "fernweh-two-hour",
        renotify: true,
        silent: false,
      });
      if (dueScheduled) localStorage.setItem(scheduledKey, "true");
      if (dueTwoHour) localStorage.setItem("fernweh.lastTwoHourReminder", String(nowMs));
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
      localStorage.setItem("fernweh.lastTwoHourReminder", String(Date.now()));
      setEnabled(true);
      setMessage("Reminders are on: every 2 hours plus your scheduled times while the app is open.");
    } catch (error) {
      setMessage(`Could not enable reminders: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function disable() {
    localStorage.removeItem("fernweh.remindersEnabled");
    setEnabled(false);
    setMessage("Reminders paused on this device.");
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission !== "granted") {
        setMessage("Enable reminders first so the browser can show a test notification.");
        return;
      }
      const selected = chooseMessage();
      const summary = await api.getSummary();
      new Notification(`${selected.title} (test)`, {
        body: `${selected.message} ${spendLine(summary)}`,
        icon: "/icon.svg",
        badge: "/icon.svg",
        silent: false,
      });
      playChime();
      setMessage("Test sent with a soft chime where the browser allows audio.");
    } catch (error) {
      setMessage(`Test failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <div className="card notification-card"><h2>Fernweh reminders</h2><p className="card-meta">Browser notifications are not supported here. Your budget still works offline on this device.</p></div>;
  }

  return (
    <div className="card notification-card">
      <div className="notification-heading">
        <div><span className="eyebrow">Gentle nudges, better trips</span><h2>Fernweh reminders</h2></div>
        <span className={`notification-pulse ${enabled && permission === "granted" ? "on" : ""}`} />
      </div>
      <p className="card-meta">A fresh spending check, motivation, or good vibe every two hours, plus your chosen times.</p>
      <div className="notification-actions">
        {enabled && permission === "granted" ? <button className="btn-primary" onClick={disable} disabled={busy}>Pause reminders</button> : <button className="btn-primary" onClick={enable} disabled={busy}>Enable reminders</button>}
        <button className="btn-ghost" onClick={sendTest} disabled={busy}>Send test</button>
      </div>
      <p className="notification-note">Works while Fernweh is open. Browser and phone settings control the notification sound.</p>
      {message && <p className="card-meta notification-message">{message}</p>}
    </div>
  );
}
