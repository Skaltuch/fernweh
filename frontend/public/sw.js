self.addEventListener("push", (event) => {
  let data = { title: "Skaltuchet", body: "Check today's spending." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Skaltuchet", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "fernweh-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
