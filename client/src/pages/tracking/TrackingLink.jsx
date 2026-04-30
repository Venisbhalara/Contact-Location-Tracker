import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getTrackingByToken } from "../../services/api";
import locationService from "../../services/locationService";
import geocodingService from "../../services/geocodingService";
import toast from "react-hot-toast";
import io from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000");

const REFRESH_INTERVAL_SEC = 10 * 60;

/* ─── tiny keyframes injected once ─────────────────────────────────────── */
const STYLES = `
  @keyframes orb-float {
    0%,100% { transform: translateY(0px) scale(1); }
    50%      { transform: translateY(-20px) scale(1.05); }
  }
  @keyframes ring-pulse {
    0%   { transform: scale(1);   opacity:0.8; }
    100% { transform: scale(2.2); opacity:0; }
  }
  @keyframes fade-up {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .orb-float  { animation: orb-float 6s ease-in-out infinite; }
  .ring-pulse { animation: ring-pulse 1.8s ease-out infinite; }
  .fade-up    { animation: fade-up 0.55s ease both; }
`;

/* ─── shared wrapper ────────────────────────────────────────────────────── */
const Page = ({ children }) => (
  <div
    className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
    style={{ background: "#0d0d17" }}
  >
    <style>{STYLES}</style>

    {/* ambient orbs */}
    <div
      className="orb-float pointer-events-none absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
      style={{
        background:
          "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
      }}
    />
    <div
      className="orb-float pointer-events-none absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full opacity-10"
      style={{
        background:
          "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)",
        animationDelay: "3s",
      }}
    />

    <div className="relative z-10 w-full max-w-sm">{children}</div>
  </div>
);

/* ─── glass card ────────────────────────────────────────────────────────── */
const GlassCard = ({ children, style }) => (
  <div
    className="fade-up rounded-3xl p-8"
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
      ...style,
    }}
  >
    {children}
  </div>
);

/* ─── pulsing icon wrapper ─────────────────────────────────────────────── */
const IconRing = ({ color, children }) => (
  <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
    <span
      className="ring-pulse absolute inset-0 rounded-full"
      style={{ background: `${color}22` }}
    />
    <span
      className="ring-pulse absolute inset-0 rounded-full"
      style={{ background: `${color}11`, animationDelay: "0.6s" }}
    />
    <div
      className="relative w-24 h-24 rounded-full flex items-center justify-center text-5xl"
      style={{
        background: `linear-gradient(135deg, ${color}20, ${color}08)`,
        border: `1px solid ${color}40`,
        boxShadow: `0 0 30px ${color}30`,
      }}
    >
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════ */
const TrackingLink = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState("idle");
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const started = useRef(false);
  const countdownRef = useRef(null);
  const handleAllowRef = useRef(null);

  /* ── load tracking ── */
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

  /* ── cleanup ── */
  useEffect(() => {
    return () => {
      if (started.current) locationService.stop();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /* ── reverse geocode ── */
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

  /* ── emit denial ── */
  const emitDenial = useCallback(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      socket.emit("permission-denied", { token });
      setTimeout(() => socket.disconnect(), 1000);
    });
  }, [token]);

  /* ── countdown ── */
  const startCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_INTERVAL_SEC;
        return prev - 1;
      });
    }, 1000);
  }, []);

  /* ── allow ── */
  const handleAllow = async () => {
    if (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }

    setConsent("tracking");
    started.current = true;

    locationService.start({
      token,
      onPosition: (pos) => {
        setPosition(pos);
        setConsent("tracking");
        // No longer need to fetch address for local display as we show a thank you message
        // fetchAddress(pos.latitude, pos.longitude);
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
        setConsent("stopped");
        if (countdownRef.current) clearInterval(countdownRef.current);
        toast("📴 The requester ended this tracking session.", { icon: "🛑" });
      },
    });

    startCountdown();
  };

  /* ── auto-resume ── */
  useEffect(() => {
    handleAllowRef.current = handleAllow;
  });

  useEffect(() => {
    if (!tracking) return;
    if (consent !== "idle") return;
    if (started.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return;

    const attemptAutoResume = async () => {
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({
            name: "geolocation",
          });
          if (result.state === "granted") {
            await new Promise((r) => setTimeout(r, 500));
            handleAllowRef.current?.();
            return;
          }
        } catch {
          handleAllowRef.current?.();
        }
      } else {
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

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  /* ══ LOADING ══════════════════════════════════════════════════════════ */
  if (loading)
    return (
      <Page>
        <GlassCard>
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full border-2 border-t-transparent mx-auto mb-6 animate-spin"
              style={{
                borderColor: "rgba(99,102,241,0.3)",
                borderTopColor: "#6366f1",
              }}
            />
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">
              Initializing…
            </p>
          </div>
        </GlassCard>
      </Page>
    );

  /* ══ LINK INVALID ═════════════════════════════════════════════════════ */
  if (error && !tracking)
    return (
      <Page>
        <GlassCard style={{ borderColor: "rgba(239,68,68,0.2)" }}>
          <IconRing color="#ef4444">🔗</IconRing>
          <h1 className="text-2xl font-black text-white text-center mb-3 tracking-tight">
            Link Expired
          </h1>
          <p className="text-slate-400 text-center text-sm leading-relaxed">
            {error}
          </p>
        </GlassCard>
      </Page>
    );

  /* ══ IDLE — consent screen ════════════════════════════════════════════ */
  if (consent === "idle")
    return (
      <Page>
        <GlassCard>
          {/* Header */}
          <IconRing color="#6366f1">
            <img src="/location.png" alt="NexTrack Logo" className="w-12 h-12 object-contain" />
          </IconRing>
          <h1 className="text-2xl font-black text-white text-center mb-2 tracking-tight">
            Location Request
          </h1>
          <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
            Give location permission to share your position with the requester.
          </p>

          {/* Terms box */}
          <div
            className="rounded-2xl p-4 mb-7 text-sm"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <p className="font-semibold text-indigo-300 mb-3 flex items-center gap-2">
              <span>ℹ️</span> Terms &amp; Conditions
            </p>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                Consent &amp; Privacy — you control when sharing starts/stops
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                User Responsibility — only share with trusted requesters
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                Data Security &amp; Limitations — GPS accuracy may vary
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                Accuracy &amp; Reliability — best outdoors with clear sky
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAllow}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: "0 0 25px rgba(99,102,241,0.4)",
              }}
            >
              ✅ Allow
            </button>
            <button
              onClick={handleDeny}
              className="w-full py-3 rounded-2xl font-semibold text-sm text-slate-400 transition-all duration-200 hover:text-white hover:bg-white/5 active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              ❌ Deny
            </button>
          </div>
        </GlassCard>
      </Page>
    );

  /* ══ TRACKING ACTIVE ══════════════════════════════════════════════════ */
  if (consent === "tracking")
    return (
      <Page>
        <GlassCard style={{ borderColor: "rgba(34,211,238,0.15)" }}>
          {!position ? (
            /* GPS acquiring — Minimalist Premium Loading */
            <div className="text-center py-10">
              <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
                {/* Background glow */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl animate-pulse" />

                {/* Outer rotating ring */}
                <div
                  className="absolute inset-0 rounded-full border-[3px] border-indigo-500/10 border-t-indigo-500 animate-spin"
                  style={{ animationDuration: "1.5s" }}
                />

                {/* Inner counter-rotating ring */}
                <div
                  className="absolute inset-4 rounded-full border-2 border-cyan-500/10 border-b-cyan-400 animate-spin"
                  style={{
                    animationDuration: "2.5s",
                    animationDirection: "reverse",
                  }}
                />

                {/* Center pulse dot */}
                <div className="relative w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse" />
              </div>
            </div>
          ) : (
            /* Location confirmed — Simplified Thank You UI */
            <div className="text-center py-4 animate-fade-in">
              <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <div
                  className="absolute -inset-4 rounded-full border border-emerald-500/10 animate-ping"
                  style={{ animationDuration: "3s" }}
                />

                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(16,185,129,0.45)] border border-emerald-300/30">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
                Thank You!
              </h1>
            </div>
          )}
        </GlassCard>
      </Page>
    );

  /* ══ STOPPED ══════════════════════════════════════════════════════════ */
  if (consent === "stopped")
    return (
      <Page>
        <GlassCard style={{ borderColor: "rgba(239,68,68,0.15)" }}>
          <IconRing color="#ef4444">🛑</IconRing>
          <h1 className="text-2xl font-black text-white text-center mb-3 tracking-tight">
            Session Ended
          </h1>
          <p className="text-slate-400 text-center text-sm leading-relaxed">
            The requester has ended this tracking session. Your location is no
            longer being shared.
          </p>
        </GlassCard>
      </Page>
    );

  /* ══ DENIED ═══════════════════════════════════════════════════════════ */
  if (consent === "denied")
    return (
      <Page>
        <GlassCard style={{ borderColor: "rgba(245,158,11,0.15)" }}>
          <IconRing color="#f59e0b">🚫</IconRing>
          <h1 className="text-2xl font-black text-white text-center mb-3 tracking-tight">
            Access Denied
          </h1>
          <p className="text-slate-400 text-center text-sm leading-relaxed">
            You chose not to share your location. The requester will not receive
            any location data.
          </p>
        </GlassCard>
      </Page>
    );

  /* ══ ERROR ════════════════════════════════════════════════════════════ */
  if (consent === "error")
    return (
      <Page>
        <GlassCard style={{ borderColor: "rgba(239,68,68,0.15)" }}>
          <IconRing color="#ef4444">⚠️</IconRing>
          <h1 className="text-2xl font-black text-white text-center mb-3 tracking-tight">
            Location Error
          </h1>
          <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
            {error}
          </p>
          <button
            onClick={handleAllow}
            className="w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: "0 0 25px rgba(99,102,241,0.35)",
            }}
          >
            🔄 Try Again
          </button>
        </GlassCard>
      </Page>
    );

  return null;
};

export default TrackingLink;
