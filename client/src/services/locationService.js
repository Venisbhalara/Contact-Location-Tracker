import { updateLocation } from './api';
import io from 'socket.io-client';

// In production (Vercel), VITE_SOCKET_URL points to the Render backend.
// In local dev, falls back to window.location.origin so Vite's /socket.io proxy works.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Auto-refresh interval: 10 minutes (in milliseconds)
const AUTO_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * LocationTrackingService
 * Handles continuous location capture and sending coordinates
 * to the backend (via REST + Socket.IO) for the target user.
 *
 * Features:
 *  - watchPosition for real-time movement tracking
 *  - 10-minute interval to force a fresh fix even when stationary
 *  - Emits 'register-sharer' so the server knows who is sharing
 *  - Stops automatically when server emits 'tracking-stopped'
 */
class LocationTrackingService {
  constructor() {
    this.watchId       = null;
    this.intervalId    = null;   // 10-min auto-refresh timer
    this.socket        = null;
    this.token         = null;
    this.onPosition    = null;
    this.onError       = null;
    this.onStopped     = null;   // callback when viewer deletes the tracking
    this.lastSentAt    = null;   // timestamp of last successful send
  }

  // ── Start tracking: request permission → send coords ─────────
  start({ token, onPosition, onError, onPermissionDenied, onStopped }) {
    this.token      = token;
    this.onPosition = onPosition;
    this.onError    = onError;
    this.onStopped  = onStopped;

    if (!('geolocation' in navigator)) {
      onError?.('Geolocation is not supported by your browser.');
      return;
    }

    // Connect to Socket.IO and register as the sharer for this token
    this.socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    this.socket.emit('join-tracking', token);
    this.socket.emit('register-sharer', token);

    // Listen for the viewer deleting the connection
    this.socket.on('tracking-stopped', () => {
      this.stop();
      this.onStopped?.();
    });

    const geoOptions = {
      enableHighAccuracy: true,
      timeout:            15000,
      maximumAge:         0,
    };

    // watchPosition fires on movement
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this._handlePosition(position),
      (err)      => this._handleError(err, onPermissionDenied),
      geoOptions
    );

    // 10-minute interval: force a fresh location fix even if user is stationary
    this.intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this._handlePosition(position),
        (err)      => console.warn('Auto-refresh location error:', err.message),
        geoOptions
      );
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  // ── Handle a new position fix ─────────────────────────────────
  async _handlePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = new Date();

    // Notify parent component
    this.onPosition?.({ latitude, longitude, accuracy, timestamp });
    this.lastSentAt = timestamp;

    // Send via REST to persist in DB
    try {
      await updateLocation({ token: this.token, latitude, longitude, accuracy });
    } catch (err) {
      console.warn('REST update failed, socket still active:', err.message);
    }

    // Also broadcast via WebSocket for real-time dashboard
    if (this.socket?.connected) {
      this.socket.emit('send-location', {
        token: this.token,
        latitude,
        longitude,
        accuracy,
      });
    }
  }

  // ── Handle geolocation error ──────────────────────────────────
  _handleError(err, onPermissionDenied) {
    if (err.code === err.PERMISSION_DENIED) {
      onPermissionDenied?.();
      this.onError?.('Location permission was denied.');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      this.onError?.('Location information is unavailable.');
    } else if (err.code === err.TIMEOUT) {
      this.onError?.('Location request timed out.');
    } else {
      this.onError?.('Unknown error while getting location.');
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
  }

  // ── Returns seconds until next auto-refresh ───────────────────
  getSecondsUntilNextRefresh() {
    if (!this.lastSentAt || !this.intervalId) return AUTO_REFRESH_INTERVAL_MS / 1000;
    const elapsed = (Date.now() - this.lastSentAt.getTime()) / 1000;
    return Math.max(0, AUTO_REFRESH_INTERVAL_MS / 1000 - elapsed);
  }
}

export default new LocationTrackingService();
