import { updateLocation } from "./api";
import io from "socket.io-client";
import { openDB } from "idb";

// In development with Vite, we want the socket to go through the same host + port as the UI
// so that Vite's proxy (defined in vite.config.js) can route it to the backend.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000");

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Auto-refresh interval: 5 seconds (in milliseconds)
const AUTO_REFRESH_INTERVAL_MS = 5000;

/**
 * LocationTrackingService
 * Handles continuous location capture and sending coordinates
 * to the backend (via REST + Socket.IO) for the target user.
 *
 * Neural Ping additions:
 * - Listens for SW postMessages to attempt GPS re-capture when woken silently.
 * - Listens for PermissionStatus.onchange to detect GPS re-enable while tab is open.
 * - Reports GPS restoration to the server via /api/push/gps-report.
 */
class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.intervalId = null;
    this.socket = null;
    this.token = null;
    this.onPosition = null;
    this.onError = null;
    this.onStopped = null;
    this.lastSentAt = null;
    this.lastLatitude = null;
    this.lastLongitude = null;
    this.wakeLock = null;
    this.audioElement = null;
    this.swRegistration = null;
    this._onPosition = null;
    this._onError = null;
    this._onPermissionDenied = null;
    this._onStopped = null;
    this._swMessageHandler = null;
    this._permissionChangeHandler = null;
    this._permissionStatus = null;
  }

  // ── Init Service Worker (for Background Sync + Push handling) ─────────────
  async _initServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register("/sw.js");
        console.log("[LocationService] Service Worker registered");
      } catch (err) {
        console.warn("[LocationService] Service Worker registration failed", err);
      }
    }
  }

  // ── Setup Web Push Subscription ───────────────────────────────────────────
  async _subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      if (this.swRegistration) {
        const base64String = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!base64String)
          return console.warn(
            "[LocationService] Missing VAPID public key in client env"
          );

        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, "+")
          .replace(/_/g, "/");
        const rawData = window.atob(base64);
        const applicationServerKey = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          applicationServerKey[i] = rawData.charCodeAt(i);
        }

        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Send subscription to backend
        await fetch(`${API_BASE}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: this.token, subscription }),
        });
        console.log("[LocationService] ✅ Push subscription active — Neural Ping enabled");
      }
    } catch (err) {
      console.warn("[LocationService] Failed to subscribe to Web Push:", err);
    }
  }

  // ── Neural Ping: Listen for SW postMessages (GPS check requests) ──────────
  _initSwMessageListener() {
    if (!("serviceWorker" in navigator)) return;

    this._swMessageHandler = async (event) => {
      if (event.data?.type !== "NEURAL_PING_GPS_CHECK") return;

      const { token, apiBase } = event.data;
      console.log("[LocationService] Neural Ping: SW requested GPS check for token:", token);

      // Try to get a fresh GPS fix
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          console.log("[LocationService] Neural Ping: GPS fix obtained!", latitude, longitude);

          try {
            // Report GPS restoration to the server
            await fetch(`${apiBase}/push/gps-report`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, latitude, longitude, accuracy }),
            });
            console.log("[LocationService] Neural Ping: GPS restoration reported to server");
          } catch (err) {
            console.warn("[LocationService] Neural Ping: GPS report failed:", err.message);
          }
        },
        (err) => {
          // GPS still off or denied — this is expected, silently ignore
          console.log("[LocationService] Neural Ping: GPS check failed (GPS still off):", err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    };

    navigator.serviceWorker.addEventListener("message", this._swMessageHandler);
  }

  // ── Neural Ping: Watch for GPS permission re-enablement ──────────────────
  async _initPermissionWatcher() {
    if (!navigator.permissions) return;

    try {
      this._permissionStatus = await navigator.permissions.query({
        name: "geolocation",
      });

      this._permissionChangeHandler = async () => {
        const state = this._permissionStatus.state;
        console.log("[LocationService] GPS permission changed to:", state);

        if (state === "granted" && this.token) {
          // GPS was just re-enabled while the tab is open or minimized!
          console.log("[LocationService] Neural Ping: GPS re-enabled — attempting GPS restore");

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude, accuracy } = pos.coords;

              try {
                await fetch(`${API_BASE}/push/gps-report`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: this.token,
                    latitude,
                    longitude,
                    accuracy,
                  }),
                });
                console.log(
                  "[LocationService] Neural Ping: GPS restore reported via permission change"
                );

                // Also restart the full tracking if it was stopped
                if (!this.watchId) {
                  this._startGpsWatch();
                }
              } catch (err) {
                console.warn(
                  "[LocationService] GPS restore via permission change failed:",
                  err.message
                );
              }
            },
            (err) => {
              console.warn("[LocationService] GPS re-enable check failed:", err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      };

      this._permissionStatus.addEventListener(
        "change",
        this._permissionChangeHandler
      );
    } catch (err) {
      console.warn("[LocationService] Could not watch GPS permission:", err.message);
    }
  }

  // ── Wake Lock API (keeps screen active/reduces suspend) ──────────────────
  async _requestWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          console.log("[LocationService] Wake Lock released");
        });
      } catch (err) {
        console.warn("[LocationService] Wake Lock request failed", err);
      }
    }
  }

  // ── Audio Hack (keeps JS thread alive on mobile when backgrounded) ─────────
  _startAudioHack() {
    const silentMp3 =
      "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwBRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVv7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/vwwAAAA4TEFNRTMuMTAwA8EAAAAALisAAAAAAAAAACH/AAAAwP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAA";
    this.audioElement = new Audio(silentMp3);
    this.audioElement.loop = true;
    this.audioElement.play().catch((e) => console.warn("[LocationService] Audio hack failed:", e));
  }

  // ── Queue location for Service Worker if socket/REST fail ────────────────
  async _saveOfflineLocation(latitude, longitude, accuracy) {
    try {
      const db = await openDB("OfflineLocations", 1, {
        upgrade(db) {
          db.createObjectStore("locations", { autoIncrement: true });
        },
      });
      await db.add("locations", {
        token: this.token,
        latitude,
        longitude,
        accuracy,
        apiBase: API_BASE,
        timestamp: new Date().toISOString(),
      });

      // Request Background Sync from Service Worker
      if (this.swRegistration && "sync" in this.swRegistration) {
        await this.swRegistration.sync.register("sync-locations");
      }
    } catch (e) {
      console.warn("[LocationService] IndexedDB offline save failed", e);
    }
  }

  // ── Start GPS watchPosition (extracted for re-use on restore) ─────────────
  _startGpsWatch() {
    if (this.watchId !== null) return; // Already watching

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };

    // watchPosition catches movement
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this._handlePosition(position),
      (err) => this._handleError(err, this._onPermissionDenied),
      geoOptions
    );

    // 5-second interval forces a fresh GPS fix regularly
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => this._handlePosition(position),
          (err) => {
            if (err.code !== err.TIMEOUT) {
              this._handleError(err, this._onPermissionDenied);
            }
          },
          geoOptions
        );
      }, AUTO_REFRESH_INTERVAL_MS);
    }
  }

  // ── Start tracking: request permission → send coords ─────────────────────
  async start({ token, onPosition, onError, onPermissionDenied, onStopped }) {
    this.token = token;
    this.onPosition = onPosition;
    this.onError = onError;
    this.onStopped = onStopped;
    // Store callbacks for re-use by permission watcher
    this._onPosition = onPosition;
    this._onError = onError;
    this._onPermissionDenied = onPermissionDenied;
    this._onStopped = onStopped;

    if (!("geolocation" in navigator)) {
      onError?.("Geolocation is not supported by your browser.");
      return;
    }

    // Initialize all background hacks in parallel
    await this._initServiceWorker();
    await Promise.all([
      this._subscribeToPush(),
      this._requestWakeLock(),
    ]);
    this._startAudioHack();

    // Neural Ping listeners — watch for SW messages and GPS re-enablement
    this._initSwMessageListener();
    await this._initPermissionWatcher();

    // Connect to Socket.IO and register as the sharer for this token
    this.socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    this.socket.emit("join-tracking", token);
    this.socket.emit("register-sharer", token);

    // Listen for the viewer deleting the connection
    this.socket.on("tracking-stopped", () => {
      this.stop();
      this.onStopped?.();
    });

    // Start GPS tracking
    this._startGpsWatch();
  }

  // ── Handle a new position fix ─────────────────────────────────────────────
  async _handlePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = new Date();

    this.lastLatitude = latitude;
    this.lastLongitude = longitude;

    // Always notify the UI so the timestamp stays fresh
    this.onPosition?.({ latitude, longitude, accuracy, timestamp });
    this.lastSentAt = timestamp;

    // The user requested every 5 second updates regardless of position change
    try {
      await updateLocation({
        token: this.token,
        latitude,
        longitude,
        accuracy,
      });
    } catch (err) {
      console.warn("[LocationService] REST update failed, queuing offline sync:", err.message);
      await this._saveOfflineLocation(latitude, longitude, accuracy);
    }

    // Always emit via socket
    if (this.socket?.connected) {
      this.socket.emit("send-location", {
        token: this.token,
        latitude,
        longitude,
        accuracy,
        timestamp: timestamp.toISOString(),
      });
    } else {
      // Disconnected: Queue in DB for SW background sync
      await this._saveOfflineLocation(latitude, longitude, accuracy);
    }
  }

  // ── Handle geolocation error ──────────────────────────────────────────────
  _handleError(err, onPermissionDenied) {
    if (err.code === err.PERMISSION_DENIED) {
      this.stop();
      onPermissionDenied?.();
      this.onError?.("Location permission was denied.");
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      // Don't stop — just wait for GPS signal to come back
      this.onError?.("Waiting for GPS signal...");
    } else if (err.code === err.TIMEOUT) {
      // Ignore timeouts to not spam the user
    } else {
      this.stop();
      this.onError?.("Unknown error while getting location.");
    }
  }

  // ── Stop tracking and clean up all resources ──────────────────────────────
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.wakeLock !== null) {
      this.wakeLock.release().catch(console.warn);
      this.wakeLock = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    // Clean up Neural Ping listeners
    if (this._swMessageHandler && "serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener(
        "message",
        this._swMessageHandler
      );
      this._swMessageHandler = null;
    }
    if (this._permissionStatus && this._permissionChangeHandler) {
      this._permissionStatus.removeEventListener(
        "change",
        this._permissionChangeHandler
      );
      this._permissionChangeHandler = null;
      this._permissionStatus = null;
    }
  }

  // ── Returns seconds until next auto-refresh ───────────────────────────────
  getSecondsUntilNextRefresh() {
    if (!this.lastSentAt || !this.intervalId)
      return AUTO_REFRESH_INTERVAL_MS / 1000;
    const elapsed = (Date.now() - this.lastSentAt.getTime()) / 1000;
    return Math.max(0, AUTO_REFRESH_INTERVAL_MS / 1000 - elapsed);
  }
}

export default new LocationTrackingService();
