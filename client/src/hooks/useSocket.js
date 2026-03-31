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
 * Now also listens for 'tracking-stopped' (emitted when the tracking is deleted)
 * and exposes a `trackingStopped` flag.
 */
const useSocket = (token) => {
  const socketRef = useRef(null);

  const [connected,       setConnected]       = useState(false);
  const [location,        setLocation]        = useState(null);   // { latitude, longitude, accuracy, timestamp }
  const [locationHistory, setHistory]         = useState([]);     // array of past positions (for path)
  const [error,           setError]           = useState(null);
  const [trackingStopped, setTrackingStopped] = useState(false);  // true when sharer stops
  const [permissionDenied, setPermissionDenied] = useState(false);

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

    // Receive live location updates
    socket.on('location-update', (data) => {
      setLocation(data);
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

    // Cleanup on unmount or token change
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { connected, location, locationHistory, error, trackingStopped, permissionDenied, clearHistory };
};

export default useSocket;
