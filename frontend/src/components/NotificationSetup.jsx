import { useEffect, useState } from "react";
import { api } from "../api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

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
        setMessage("Notifications were blocked. Enable them in your browser/phone settings to get reminders.");
        return;
      }

      const { publicKey } = await api.getVapidPublicKey();
      if (!publicKey) {
        setMessage("Backend has no VAPID key configured yet — see the README to set one up.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.subscribePush(sub.toJSON());
      setMessage("Reminders are on. You'll get a push at your scheduled times.");
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
      const res = await api.testPush();
      setMessage(res.sent > 0 ? "Test notification sent." : "No active subscription found yet — enable reminders first.");
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
          Push notifications aren't supported in this browser. On a phone, add this app to your
          home screen first (Share → Add to Home Screen), then open it from there.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Reminders</h2>
      <div className="notif-status" style={{ marginBottom: 12 }}>
        <span className={`dot ${permission === "granted" ? "on" : "off"}`} />
        {permission === "granted" ? "Notifications enabled" : "Notifications not set up yet"}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={enable} disabled={busy}>
          {permission === "granted" ? "Re-subscribe this device" : "Enable reminders"}
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
