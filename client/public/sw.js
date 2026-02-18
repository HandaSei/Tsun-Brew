var timerTimeout = null;
var timerEndTime = null;
var ALARM_SOUND_URL = "https://res.cloudinary.com/dq9nrlsb9/video/upload/v1771025474/zapsplat_multimedia_ui_processing_or_timer_tone_musical_warm_mallets_85166_an2opt.mp3";

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

self.addEventListener("message", function(event) {
  var data = event.data;
  if (!data) return;

  if (data.type === "START_TIMER") {
    if (timerTimeout) clearTimeout(timerTimeout);
    var ms = data.durationMs;
    timerEndTime = Date.now() + ms;
    var teaName = data.teaName || "Your tea";

    timerTimeout = setTimeout(function() {
      timerTimeout = null;
      timerEndTime = null;
      self.registration.showNotification("Tsun Brew - Timer Done", {
        body: teaName + " brew is ready!",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        requireInteraction: true,
        tag: "brew-timer",
        vibrate: [200, 100, 200, 100, 200],
        actions: [{ action: "stop", title: "Stop Alarm" }],
      });
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          clientList[i].postMessage({ type: "TIMER_COMPLETE" });
        }
      });
    }, ms);
  }

  if (data.type === "CANCEL_TIMER") {
    if (timerTimeout) {
      clearTimeout(timerTimeout);
      timerTimeout = null;
      timerEndTime = null;
    }
  }

  if (data.type === "GET_TIMER_STATUS") {
    var remaining = timerEndTime ? Math.max(0, timerEndTime - Date.now()) : 0;
    event.source.postMessage({
      type: "TIMER_STATUS",
      remainingMs: remaining,
      isActive: !!timerTimeout,
    });
  }
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
      vibrate: [200, 100, 200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
    timerEndTime = null;
  }
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
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
    timerEndTime = null;
  }
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      clientList[i].postMessage({ type: "STOP_ALARM" });
    }
  });
});
