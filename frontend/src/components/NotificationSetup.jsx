import { useEffect, useState } from "react";
import { api } from "../api.js";

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

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
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
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support background push notifications.");
      }
      const { publicKey } = await api.getVapidPublicKey();
      if (!publicKey) throw new Error("The push service is missing its VAPID keys.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const [settings, summary] = await Promise.all([api.getSettings(), api.getSummary()]);
      await api.subscribePush({ subscription: subscription.toJSON(), settings, summary });
      localStorage.setItem("fernweh.pushEndpoint", subscription.endpoint);
      localStorage.setItem("fernweh.remindersEnabled", "true");
      localStorage.setItem("fernweh.lastTwoHourReminder", String(Date.now()));
      setEnabled(true);
      setMessage("Background reminders are on: every 2 hours plus your scheduled times.");
    } catch (error) {
      setMessage(`Could not enable reminders: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function disable() {
    const endpoint = localStorage.getItem("fernweh.pushEndpoint");
    api.unsubscribePush(endpoint).catch(() => {}).finally(() => {
      localStorage.removeItem("fernweh.pushEndpoint");
      localStorage.removeItem("fernweh.remindersEnabled");
      setEnabled(false);
      setMessage("Reminders paused on this device.");
    });
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    try {
      if (Notification.permission !== "granted") {
        setMessage("Enable reminders first so the browser can show a test notification.");
        return;
      }
      const endpoint = localStorage.getItem("fernweh.pushEndpoint");
      if (!endpoint) throw new Error("Enable background reminders first.");
      await api.testPush(endpoint);
      playChime();
      setMessage("Background test sent. Your phone controls the notification sound.");
    } catch (error) {
      setMessage(`Test failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <div className="card notification-card"><h2>Skaltuchet reminders</h2><p className="card-meta">Browser notifications are not supported here. Your budget still works offline on this device.</p></div>;
  }

  return (
    <div className="card notification-card">
      <div className="notification-heading">
        <div><span className="eyebrow">Gentle nudges, better goals</span><h2>Skaltuchet reminders</h2></div>
        <span className={`notification-pulse ${enabled && permission === "granted" ? "on" : ""}`} />
      </div>
      <p className="card-meta">A fresh spending check, motivation, or good vibe every two hours, plus your chosen times.</p>
      <div className="notification-actions">
        {enabled && permission === "granted" ? <button className="btn-primary" onClick={disable} disabled={busy}>Pause reminders</button> : <button className="btn-primary" onClick={enable} disabled={busy}>Enable reminders</button>}
        <button className="btn-ghost" onClick={sendTest} disabled={busy}>Send test</button>
      </div>
      <p className="notification-note">Background delivery is handled by the push service. Your phone controls the notification sound.</p>
      {message && <p className="card-meta notification-message">{message}</p>}
    </div>
  );
}
