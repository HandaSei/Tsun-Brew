self.addEventListener("install", function() {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("push", function(event) {
  var data = event.data ? event.data.json() : {};
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

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && "focus" in clientList[i]) {
          clientList[i].focus();
          clientList[i].postMessage({ type: "STOP_ALARM" });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

self.addEventListener("notificationclose", function(event) {
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      clientList[i].postMessage({ type: "STOP_ALARM" });
    }
  });
});
