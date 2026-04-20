import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getTrackingByToken } from "../../services/api";
import locationService from "../../services/locationService";
import geocodingService from "../../services/geocodingService";
import toast from "react-hot-toast";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

// Auto-refresh interval in seconds (matches locationService.js)
const REFRESH_INTERVAL_SEC = 10 * 60;

const TrackingLink = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState("idle"); // idle | tracking | denied | stopped | error
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(null); // { formatted, road, area, city, state }
  const [addrLoading, setAddrLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC); // seconds until next refresh
  const started = useRef(false);
  const countdownRef = useRef(null);
  const handleAllowRef = useRef(null); // Ref so auto-resume can call handleAllow

  // ── Load tracking info ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTrackingByToken(token);
        setTracking(res.data.tracking);
      } catch {
        setError("Invalid or expired tracking link.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (started.current) locationService.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Reverse geocode whenever position changes ───────────────
  const fetchAddress = useCallback(async (lat, lon) => {
    setAddrLoading(true);
    try {
      const addr = await geocodingService.reverseGeocode(lat, lon);
      setAddress(addr);
    } catch {
      setAddress(null);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  // ── Emit Permission Denied ──────────────────────────────────
  const emitDenial = useCallback(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      socket.emit("permission-denied", { token });
      setTimeout(() => socket.disconnect(), 1000);
    });
  }, [token]);

  // ── Start countdown timer ───────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset countdown when it hits 0 (auto-refresh fires in locationService)
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Allow button: start tracking ───────────────────────────
  const handleAllow = async () => {
    // Keep ref in sync so auto-resume effect can call it
    // 1. Ask for Notification permission FIRST
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        try {
          await Notification.requestPermission();
        } catch (err) {
          console.warn("Notification permission request failed:", err);
        }
      }
    }

    setConsent("tracking");
    started.current = true;

    // 2. Ask for Location permission and start tracking
    locationService.start({
      token,
      onPosition: (pos) => {
        setPosition(pos);
        setConsent("tracking");
        fetchAddress(pos.latitude, pos.longitude);
        // Reset countdown whenever a fresh location is sent
        startCountdown();
      },
      onError: (msg) => {
        setError(msg);
        setConsent("error");
        toast.error(msg);
      },
      onPermissionDenied: () => {
        setConsent("denied");
        emitDenial();
      },
      onStopped: () => {
        // The viewer deleted the tracking — stop everything
        setConsent("stopped");
        if (countdownRef.current) clearInterval(countdownRef.current);
        toast("📴 The requester ended this tracking session.", { icon: "🛑" });
      },
    });

    // Start the visual countdown
    startCountdown();
  };

  // ── Auto-Resume: triggered when page opens with ?resume=1 ── 
  // When the user taps the "Resume Location Sharing" push notification,
  // the tracking page opens with ?resume=1. If GPS permission was already
  // granted, we auto-start tracking WITHOUT requiring user to tap Allow again.
  useEffect(() => {
    // Update the ref whenever handleAllow changes
    handleAllowRef.current = handleAllow;
  });

  useEffect(() => {
    if (!tracking) return; // Wait until tracking data is loaded
    if (consent !== "idle") return; // Don't auto-start if already tracking/denied
    if (started.current) return;

    const params = new URLSearchParams(window.location.search);
    const shouldResume = params.get("resume") === "1";
    if (!shouldResume) return;

    console.log("[TrackingLink] ?resume=1 detected — checking GPS permission...");

    const attemptAutoResume = async () => {
      // Check if GPS permission is already granted (no prompt needed)
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (result.state === "granted") {
            console.log("[TrackingLink] GPS already granted — auto-starting tracking!");
            // Small delay so the UI renders first
            await new Promise((r) => setTimeout(r, 500));
            handleAllowRef.current?.();
            return;
          }
          console.log("[TrackingLink] GPS permission state:", result.state, "— cannot auto-resume");
        } catch (err) {
          console.warn("[TrackingLink] Permission query failed:", err.message);
          // Fallback: just try starting — browser will prompt if needed
          handleAllowRef.current?.();
        }
      } else {
        // permissions API not supported — try starting anyway
        handleAllowRef.current?.();
      }
    };

    attemptAutoResume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking, consent]);

  const handleDeny = () => {
    setConsent("denied");
    emitDenial();
  };

  // ── Format countdown mm:ss ──────────────────────────────────
  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error && !tracking)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-md w-full">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-white mb-2">
            Link Invalid or Expired
          </h1>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* ── Idle — ask for consent ──────────────────────── */}
        {consent === "idle" && (
          <div className="card text-center">
            <div className="text-5xl mb-4">📍</div>
            <h1 className="text-xl font-bold text-white mb-2">
              Location Access Request
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              {/* Someone has requested to see your location. This app will share your GPS coordinates with the requester. */}
              Give location permission to Access this website
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300 mb-6 text-left">
              <p className="font-semibold mb-2">ℹ️ Terms & Conditions:</p>
              <ul className="space-y-1 text-xs">
                <li>• Consent & Privacy</li>
                <li>• User Responsibility</li>
                <li>• Data Security & Limitations</li>
                <li>• Accuracy & Reliability</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAllow}
                className="btn-primary w-full py-4 text-base"
              >
                ✅ Allow Location Access
              </button>
              <button
                onClick={handleDeny}
                className="btn-secondary w-full py-3"
              >
                ❌ Deny
              </button>
            </div>
          </div>
        )}

        {/* ── Tracking active ─────────────────────────────── */}
        {consent === "tracking" && (
          <div className="card text-center min-h-[200px] flex flex-col items-center justify-center">
            {!position ? (
              <>
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                <h1 className="text-xl font-bold text-white mb-2">
                  Please wait...
                </h1>
                {/* <p className="text-slate-400 text-sm">Please wait while we connect to GPS...</p> */}
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
                  ✅
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Thank You!
                </h1>
                {/* <p className="text-emerald-400 text-sm font-medium">.</p> */}
              </>
            )}
          </div>
        )}

        {/* ── Tracking stopped by viewer ──────────────────── */}
        {consent === "stopped" && (
          <div className="card text-center">
            <div className="text-5xl mb-4">🛑</div>
            <h1 className="text-xl font-bold text-white mb-2">
              Tracking Ended
            </h1>
            <p className="text-slate-400 text-sm">
              The requester has ended this tracking session. Your location is no
              longer being shared.
            </p>
          </div>
        )}

        {/* ── Permission denied ───────────────────────────── */}
        {consent === "denied" && (
          <div className="card text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h1 className="text-xl font-bold text-white mb-2">
              Location Access Denied
            </h1>
            <p className="text-slate-400 text-sm">
              You chose not to share your location. The requester will not
              receive any location data.
            </p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────── */}
        {consent === "error" && (
          <div className="card text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">
              Location Error
            </h1>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <button onClick={handleAllow} className="btn-primary w-full">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingLink;
