import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

// In production (Vercel), VITE_SOCKET_URL points to the Render backend.
// In local dev, falls back to window.location.origin so Vite's /socket.io proxy works.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/**
 * useSocket — connects to the Socket.IO server and joins a tracking room.
 * Used by the REQUESTER's dashboard to receive live location updates.
 *
 * Neural Ping additions:
 * - Listens for 'sharer-offline'   → triggers instant alert banner on viewer's map.
 * - Listens for 'ip-location-update' → updates map to show approximate IP-based circle.
 * - Listens for 'gps-restored'     → snaps map back to precise GPS pin.
 * - Listens for 'sharer-online'    → clears any offline banners.
 */
const useSocket = (token) => {
  const socketRef = useRef(null);

  const [connected,         setConnected]       = useState(false);
  const [location,          setLocation]        = useState(null);   // { latitude, longitude, accuracy, timestamp }
  const [locationHistory,   setHistory]         = useState([]);     // array of past positions (for path)
  const [error,             setError]           = useState(null);
  const [trackingStopped,   setTrackingStopped] = useState(false);  // true when sharer stops
  const [permissionDenied,  setPermissionDenied] = useState(false);

  // ── Neural Ping state ─────────────────────────────────────────────────────
  // locationMode: "gps" | "ip" | "offline"
  const [locationMode,  setLocationMode]  = useState('offline');
  // sharerOnline: whether the sharer's socket is connected
  const [sharerOnline,  setSharerOnline]  = useState(false);
  // ipLocation: the IP-based approximate coordinates
  const [ipLocation,    setIpLocation]    = useState(null); // { latitude, longitude, city, country, isp, accuracyNote }
  // offlineEvent: timestamp + message when sharer went offline
  const [offlineEvent,  setOfflineEvent]  = useState(null);

  useEffect(() => {
    if (!token) return;

    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      // Join the tracking room for this token
      socket.emit('join-tracking', token);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setError('Unable to connect to real-time server. Retrying...');
      setConnected(false);
    });

    // ── Live GPS location updates (normal mode) ───────────────────────────
    socket.on('location-update', (data) => {
      setLocation(data);
      setLocationMode('gps');
      setSharerOnline(true);
      setOfflineEvent(null); // Clear any offline banner
      setHistory((prev) => {
        const updated = [...prev, data];
        // Keep last 100 positions for the path
        return updated.length > 100 ? updated.slice(-100) : updated;
      });
    });

    // The requester (viewer) deleted the tracking — session ended
    socket.on('tracking-stopped', () => {
      setTrackingStopped(true);
      setConnected(false);
    });

    socket.on('permission-denied', () => {
      setPermissionDenied(true);
    });

    // ── NEURAL PING events ────────────────────────────────────────────────

    // Event 1: Sharer went offline (tab closed / network lost)
    socket.on('sharer-offline', (data) => {
      console.log('[useSocket] sharer-offline received:', data);
      setSharerOnline(false);
      setLocationMode('offline'); // temporarily offline until IP ping succeeds
      setOfflineEvent({
        timestamp: new Date(data.timestamp),
        message: data.message,
      });
    });

    // Event 2: IP-based location obtained (Neural Ping resolved)
    socket.on('ip-location-update', (data) => {
      console.log('[useSocket] ip-location-update received:', data);
      setIpLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country,
        isp: data.isp,
        accuracyNote: data.accuracyNote,
        timestamp: new Date(data.timestamp),
      });
      setLocationMode('ip');
      setSharerOnline(false); // Still offline (tab closed), just IP-located
    });

    // Event 3: GPS was re-enabled — switch back to precise mode
    socket.on('gps-restored', (data) => {
      console.log('[useSocket] gps-restored received:', data);
      const loc = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date(data.timestamp),
      };
      setLocation(loc);
      setLocationMode('gps');
      setSharerOnline(true);
      setOfflineEvent(null);
      setIpLocation(null); // Clear IP location
      setHistory((prev) => {
        const updated = [...prev, loc];
        return updated.length > 100 ? updated.slice(-100) : updated;
      });
    });

    // Event 4: Sharer reconnected (socket re-registered)
    socket.on('sharer-online', (data) => {
      console.log('[useSocket] sharer-online received:', data);
      setSharerOnline(true);
      setLocationMode('gps');
      setOfflineEvent(null);
      setIpLocation(null);
    });

    // Cleanup on unmount or token change
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    connected,
    location,
    locationHistory,
    error,
    trackingStopped,
    permissionDenied,
    clearHistory,
    // Neural Ping state
    locationMode,
    sharerOnline,
    ipLocation,
    offlineEvent,
  };
};

export default useSocket;
