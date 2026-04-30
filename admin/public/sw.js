const CACHE_NAME = "location-tracker-v1";
const API_URL = "/api/location"; // Will be absolute when fetched

// Service worker install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Use indexedDB helper script (we will load the idb library or use manual opening)
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

// Ensure locations are pushed when background sync fires
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-locations") {
    event.waitUntil(
      (async () => {
        try {
          const data = await getOfflineData();
          if (data && data.length > 0) {
            // Push all offline data in bulk or sequentially
            // Determine backend base url
            // In dev Vite running on localhost:5173, api might be localhost:3000
            // Get it from one of the stored locations
            const url =
              data[0].apiUrl || self.registration.scope + "api/location/update";

            for (const loc of data) {
              await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  token: loc.token,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  accuracy: loc.accuracy,
                }),
              });
            }
            await clearOfflineData();
          }
        } catch (err) {
          console.error("Background sync failed:", err);
          throw err; // retry later
        }
      })(),
    );
  }
});

// Since the service worker lacks `navigator.geolocation`, it cannot actively fetch coordinates during the background sync.
// It can only upload buffered locations when online (PWA standard).

// Background fetch listener (if enabled in modern browsers)
self.addEventListener("backgroundfetchsuccess", (event) => {});

// ─── Web Push Notification Listeners ─────────────────────────────

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Location Update Required";
  const options = {
    body:
      payload.body ||
      "Admin is requesting your current location. Tap to update.",
    icon: payload.icon || "/location.png",
    badge: "/location.png",
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: payload.data || {},
    requireInteraction: true, // Keeps the notification open until the user clicks it!
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // The URL configured directly by the server ping data
  const urlToOpen = event.notification.data?.url || "/";

  // Look to see if the tracking window is already open
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Find the window matching the URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If they already have the tracker tab open anywhere, focus it
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }

        // Otherwise, open a new window to that url
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
