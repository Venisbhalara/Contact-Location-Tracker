const CACHE_NAME = 'location-tracker-v1';
const API_URL = '/api/location'; // Will be absolute when fetched

// Service worker install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Use indexedDB helper script (we will load the idb library or use manual opening)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineLocations', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineData() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('locations', 'readonly');
    const store = tx.objectStore('locations');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function clearOfflineData() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('locations', 'readwrite');
    tx.objectStore('locations').clear();
    tx.oncomplete = () => resolve();
  });
}

// Ensure locations are pushed when background sync fires
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(
      (async () => {
        try {
          const data = await getOfflineData();
          if (data && data.length > 0) {
            // Push all offline data in bulk or sequentially
            // Determine backend base url 
            // In dev Vite running on localhost:5173, api might be localhost:3000
            // Get it from one of the stored locations
            const url = data[0].apiUrl || self.registration.scope + 'api/location/update'; 
            
            for (const loc of data) {
              await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: loc.token,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  accuracy: loc.accuracy
                }),
              });
            }
            await clearOfflineData();
          }
        } catch (err) {
          console.error("Background sync failed:", err);
          throw err; // retry later
        }
      })()
    );
  }
});

// Since the service worker lacks `navigator.geolocation`, it cannot actively fetch coordinates during the background sync. 
// It can only upload buffered locations when online (PWA standard).

// Background fetch listener (if enabled in modern browsers)
self.addEventListener('backgroundfetchsuccess', (event) => {});
