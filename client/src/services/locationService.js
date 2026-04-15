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

// Auto-refresh interval: 5 seconds (in milliseconds)
const AUTO_REFRESH_INTERVAL_MS = 5000;

/**
 * LocationTrackingService
 * Handles continuous location capture and sending coordinates
 * to the backend (via REST + Socket.IO) for the target user.
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
  }

  // ── Init Service Worker (for Background Sync handling) ────────
  async _initServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.warn("Service Worker registration failed", err);
      }
    }
  }

  // ── Setup Web Push Subscription ───────────────────────────────
  async _subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      if (this.swRegistration) {
        const base64String = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!base64String) return console.warn("Missing VAPID public key in client env");
        
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
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
        const API_BASE = import.meta.env.VITE_API_URL || "/api";
        await fetch(`${API_BASE}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: this.token, subscription }),
        });
        console.log("✅ Successfully subscribed to Push Pings");
      }
    } catch (err) {
      console.warn("Failed to subscribe to Web Push:", err);
    }
  }

  // ── Wake Lock API (keeps screen active/reduces suspend) ───────
  async _requestWakeLock() {
    if ("wakeLock" in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request("screen");
          this.wakeLock.addEventListener("release", () => {
            console.log("Wake Lock was released");
          });
        } catch (err) {
          console.warn("Wake Lock request failed", err);
        }
    }
  }

  // ── Audio Hack (keeps JS thread alive on mobile when backgrounded)
  _startAudioHack() {
    // A tiny, silent base64 MP3 that loops infinitely
    const silentMp3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwBRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVv7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/vwwAAAA4TEFNRTMuMTAwA8EAAAAALisAAAAAAAAAACH/AAAAwP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAAP/zRAsAAAMyAABiMgA1g8UAAAAAAAAAAAAAAAAAAAAAA";
    this.audioElement = new Audio(silentMp3);
    this.audioElement.loop = true;
    // Play the audio (requires user interaction first, which they just did by clicking "allow")
    this.audioElement.play().catch(e => console.warn('Audio hack failed', e));
  }

  // ── Queue location for Service Worker if socket/REST fail ─────
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
        timestamp: new Date().toISOString()
      });
      
      // Request Background Sync from Service Worker
      if (this.swRegistration && "sync" in this.swRegistration) {
        await this.swRegistration.sync.register("sync-locations");
      }
    } catch (e) {
      console.warn("IndexedDB offline save failed", e);
    }
  }

  // ── Start tracking: request permission → send coords ─────────
  async start({ token, onPosition, onError, onPermissionDenied, onStopped }) {
    this.token = token;
    this.onPosition = onPosition;
    this.onError = onError;
    this.onStopped = onStopped;

    if (!("geolocation" in navigator)) {
      onError?.("Geolocation is not supported by your browser.");
      return;
    }

    // Initialize all our background persistence hacks
    await this._initServiceWorker();
    await this._subscribeToPush(); // Setup Web Push
    await this._requestWakeLock();
    this._startAudioHack();

    // Connect to Socket.IO and register as the sharer for this token
    this.socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    this.socket.emit("join-tracking", token);
    this.socket.emit("register-sharer", token);

    // Listen for the viewer deleting the connection
    this.socket.on("tracking-stopped", () => {
      this.stop();
      this.onStopped?.();
    });

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000, 
      maximumAge: 0, 
    };

    // watchPosition still runs — catches immediate movement
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this._handlePosition(position),
      (err) => this._handleError(err, onPermissionDenied),
      geoOptions,
    );

    // 5-second interval — forces a fresh GPS fix every 5 seconds
    this.intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this._handlePosition(position),
        (err) => {
          if (err.code !== err.TIMEOUT) {
            this._handleError(err, onPermissionDenied);
          }
        },
        geoOptions,
      );
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  // ── Handle a new position fix ─────────────────────────────────
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
      console.warn("REST update failed, queuing offline sync:", err.message);
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

  // ── Handle geolocation error ──────────────────────────────────
  _handleError(err, onPermissionDenied) {
    if (err.code === err.PERMISSION_DENIED) {
      this.stop();
      onPermissionDenied?.();
      this.onError?.("Location permission was denied.");
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      // We don't stop here, we just wait for the signal to come back.
      this.onError?.("Waiting for GPS signal...");
    } else if (err.code === err.TIMEOUT) {
      // Ignore timeouts to not spam the user
    } else {
      this.stop();
      this.onError?.("Unknown error while getting location.");
    }
  }

  // ── Stop tracking and clean up ────────────────────────────────
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
  }

  // ── Returns seconds until next auto-refresh ───────────────────
  getSecondsUntilNextRefresh() {
    if (!this.lastSentAt || !this.intervalId)
      return AUTO_REFRESH_INTERVAL_MS / 1000;
    const elapsed = (Date.now() - this.lastSentAt.getTime()) / 1000;
    return Math.max(0, AUTO_REFRESH_INTERVAL_MS / 1000 - elapsed);
  }
}

export default new LocationTrackingService();
