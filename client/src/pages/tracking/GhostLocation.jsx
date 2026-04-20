/**
 * GhostLocation.jsx
 *
 * The "Ghost Window" — opened silently by the Service Worker push handler
 * when the sharer's tab is closed but GPS is on.
 *
 * Flow:
 *   SW push arrives → no open windows detected → SW calls clients.openWindow('/ghost?token=TOKEN')
 *   → This page loads → navigator.geolocation.getCurrentPosition() runs (permission already granted)
 *   → Coordinates sent to /api/push/gps-report
 *   → Server emits 'gps-restored' to viewer's Socket.IO room
 *   → This page closes itself (or redirects to track page if close fails)
 *
 * Design: Minimal, ultra-fast, no-friction. Built to open and close in ~2 seconds.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const STATUS = {
  ACQUIRING: "acquiring",
  REPORTING: "reporting",
  SUCCESS: "success",
  GPS_OFF: "gps_off",
  ERROR: "error",
};

const GhostLocation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const apiBase = searchParams.get("apiBase") || "/api";

  const [status, setStatus] = useState(STATUS.ACQUIRING);
  const [coords, setCoords] = useState(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setStatus(STATUS.ERROR);
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ latitude, longitude, accuracy });
        setStatus(STATUS.REPORTING);

        try {
          const res = await fetch(`${apiBase}/push/gps-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, latitude, longitude, accuracy }),
          });

          if (res.ok) {
            setStatus(STATUS.SUCCESS);
          } else {
            setStatus(STATUS.ERROR);
          }
        } catch {
          setStatus(STATUS.ERROR);
        }

        // Close after 2 seconds regardless
        autoClose(2000);
      },
      (err) => {
        // GPS is off or denied — this tab opened before GPS came on properly
        if (err.code === err.PERMISSION_DENIED) {
          setStatus(STATUS.ERROR);
        } else {
          setStatus(STATUS.GPS_OFF);
        }
        autoClose(1500);
      },
      geoOptions
    );
  }, [token, apiBase]);

  // Countdown for auto-close visual
  useEffect(() => {
    if (status !== STATUS.SUCCESS && status !== STATUS.GPS_OFF) return;
    const t = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  const autoClose = (delay) => {
    setTimeout(() => {
      // Attempt 1: window.close() — works if opened by SW clients.openWindow()
      window.close();

      // Attempt 2: If window.close() didn't work, redirect to the tracking page
      // (This is the fullback for browsers where close() is blocked)
      setTimeout(() => {
        if (!window.closed) {
          window.location.replace(`/track/${token}`);
        }
      }, 300);
    }, delay);
  };

  const getStatusConfig = () => {
    switch (status) {
      case STATUS.ACQUIRING:
        return {
          icon: "🛰️",
          title: "Acquiring GPS...",
          subtitle: "Getting your precise location",
          color: "#6366f1",
          glow: "rgba(99,102,241,0.3)",
          showSpinner: true,
        };
      case STATUS.REPORTING:
        return {
          icon: "📡",
          title: "Sending Location...",
          subtitle: "Reporting to the server",
          color: "#f59e0b",
          glow: "rgba(245,158,11,0.3)",
          showSpinner: true,
        };
      case STATUS.SUCCESS:
        return {
          icon: "✅",
          title: "Location Shared!",
          subtitle: coords
            ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} · ±${Math.round(coords.accuracy)}m`
            : "Precise GPS coordinates sent to requester",
          color: "#10b981",
          glow: "rgba(16,185,129,0.3)",
          showSpinner: false,
        };
      case STATUS.GPS_OFF:
        return {
          icon: "📴",
          title: "GPS Unavailable",
          subtitle: "Location services may still be off. Closing...",
          color: "#f97316",
          glow: "rgba(249,115,22,0.2)",
          showSpinner: false,
        };
      case STATUS.ERROR:
      default:
        return {
          icon: "⚠️",
          title: "Could Not Get Location",
          subtitle: "Please ensure location permission is granted.",
          color: "#ef4444",
          glow: "rgba(239,68,68,0.2)",
          showSpinner: false,
        };
    }
  };

  const cfg = getStatusConfig();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 20,
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${cfg.glow}, transparent)`,
          pointerEvents: "none",
          transition: "background 0.8s ease",
        }}
      />

      {/* Main card */}
      <div
        style={{
          position: "relative",
          background: "rgba(15,23,42,0.95)",
          border: `1px solid ${cfg.color}33`,
          borderRadius: 24,
          padding: "40px 36px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: `0 0 60px ${cfg.glow}, 0 25px 50px rgba(0,0,0,0.5)`,
          backdropFilter: "blur(20px)",
          transition: "border-color 0.8s ease, box-shadow 0.8s ease",
        }}
      >
        {/* App name */}
        <p
          style={{
            fontSize: 11,
            letterSpacing: 3,
            color: "rgba(148,163,184,0.5)",
            textTransform: "uppercase",
            margin: "0 0 28px",
          }}
        >
          Location Tracker
        </p>

        {/* Icon */}
        <div
          style={{
            fontSize: 52,
            marginBottom: 20,
            lineHeight: 1,
            filter: `drop-shadow(0 0 20px ${cfg.glow})`,
            animation: status === STATUS.ACQUIRING ? "float 2s ease-in-out infinite" : "none",
          }}
        >
          {cfg.icon}
        </div>

        {/* Spinner (shown while working) */}
        {cfg.showSpinner && (
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${cfg.color}22`,
              borderTop: `3px solid ${cfg.color}`,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 20px",
            }}
          />
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: cfg.color,
            margin: "0 0 8px",
            letterSpacing: -0.5,
            transition: "color 0.8s ease",
          }}
        >
          {cfg.title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 12,
            color: "rgba(148,163,184,0.65)",
            margin: "0 0 24px",
            lineHeight: 1.6,
            fontFamily: "monospace",
          }}
        >
          {cfg.subtitle}
        </p>

        {/* Progress dots */}
        {cfg.showSpinner && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: cfg.color,
                  opacity: 0.3,
                  animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
        )}

        {/* Countdown / auto-close indicator */}
        {(status === STATUS.SUCCESS || status === STATUS.GPS_OFF) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 16px",
              background: `${cfg.color}11`,
              border: `1px solid ${cfg.color}22`,
              borderRadius: 100,
              fontSize: 11,
              color: `${cfg.color}99`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cfg.color,
                opacity: 0.6,
              }}
            />
            Closing in {countdown}s...
          </div>
        )}

        {/* Accuracy badge */}
        {coords && status === STATUS.SUCCESS && (
          <div
            style={{
              marginTop: 16,
              padding: "6px 12px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: 8,
              fontSize: 11,
              color: "rgba(52,211,153,0.7)",
              fontFamily: "monospace",
            }}
          >
            GPS Accuracy: ±{Math.round(coords.accuracy)}m
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GhostLocation;
