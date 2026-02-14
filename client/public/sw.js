const CACHE_NAME = "tsun-brew-v3";

const PRECACHE_URLS = [
  "/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Tsun Brew", {
      body: data.body || "Your brew is ready!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      requireInteraction: true,
      tag: "brew-timer",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          client.focus();
          client.postMessage({ type: "STOP_ALARM" });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage({ type: "STOP_ALARM" });
    }
  });
});
