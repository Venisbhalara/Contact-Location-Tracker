import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import { getTrackingByToken } from "../../services/api";
import geocodingService from "../../services/geocodingService";
import useSocket from "../../hooks/useSocket";
import toast from "react-hot-toast";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Precise GPS live marker (green pulse)
const liveIcon = new L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#22c55e;border:3px solid white;
    box-shadow:0 0 0 4px rgba(34,197,94,0.4);
    animation:gps-pulse 1.5s ease-in-out infinite;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// IP-mode approximate marker (orange)
const ipIcon = new L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#f97316;border:3px solid white;
    box-shadow:0 0 0 4px rgba(249,115,22,0.3);
    animation:ip-pulse 2s ease-in-out infinite;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Auto-center map on new position
const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], 16);
  }, [position, map]);
  return null;
};

// ── NEURAL PING STATUS BAR ─────────────────────────────────────────────────────
const NeuralPingStatusBar = ({ locationMode, sharerOnline, offlineEvent, ipLocation }) => {
  const [dot, setDot] = useState(true);

  // Blinking dot for alive indicators
  useEffect(() => {
    const t = setInterval(() => setDot((d) => !d), 800);
    return () => clearInterval(t);
  }, []);

  if (locationMode === "gps" && sharerOnline) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)",
          border: "1px solid rgba(16,185,129,0.4)",
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#10b981",
            boxShadow: dot ? "0 0 0 4px rgba(16,185,129,0.3)" : "0 0 0 0px rgba(16,185,129,0)",
            transition: "box-shadow 0.8s",
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ color: "#10b981", fontWeight: 700, fontSize: 13, margin: 0 }}>
            ✅ Precision GPS Mode — Live
          </p>
          <p style={{ color: "rgba(156,220,170,0.7)", fontSize: 11, margin: 0 }}>
            Real-time GPS coordinates are streaming. Accuracy: ±5m
          </p>
        </div>
        <div style={{ marginLeft: "auto", background: "rgba(16,185,129,0.2)", borderRadius: 6, padding: "2px 8px" }}>
          <span style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>
    );
  }

  if (locationMode === "ip" && ipLocation) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.1) 100%)",
          border: "1px solid rgba(249,115,22,0.4)",
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: 8 }}>
          <div
            style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "#f97316",
              boxShadow: dot ? "0 0 0 4px rgba(249,115,22,0.3)" : "0 0 0 0px rgba(249,115,22,0)",
              transition: "box-shadow 0.8s",
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ color: "#f97316", fontWeight: 700, fontSize: 13, margin: 0 }}>
              ⚠️ Internet Mode — GPS is Off
            </p>
            <p style={{ color: "rgba(251,191,36,0.7)", fontSize: 11, margin: 0 }}>
              Location fetched via mobile internet (IP address). Showing approximate area.
            </p>
          </div>
          <div style={{ marginLeft: "auto", background: "rgba(249,115,22,0.2)", borderRadius: 6, padding: "2px 8px" }}>
            <span style={{ color: "#f97316", fontSize: 11, fontWeight: 600 }}>~IP</span>
          </div>
        </div>
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8, marginTop: 8,
            background: "rgba(249,115,22,0.07)",
            borderRadius: 8, padding: "8px 10px",
          }}
        >
          <div>
            <p style={{ color: "rgba(249,115,22,0.6)", fontSize: 10, margin: 0 }}>City</p>
            <p style={{ color: "#fdba74", fontSize: 12, fontWeight: 600, margin: 0 }}>
              {ipLocation.city || "—"}
            </p>
          </div>
          <div>
            <p style={{ color: "rgba(249,115,22,0.6)", fontSize: 10, margin: 0 }}>Country</p>
            <p style={{ color: "#fdba74", fontSize: 12, fontWeight: 600, margin: 0 }}>
              {ipLocation.country || "—"}
            </p>
          </div>
          <div>
            <p style={{ color: "rgba(249,115,22,0.6)", fontSize: 10, margin: 0 }}>ISP</p>
            <p style={{ color: "#fdba74", fontSize: 12, fontWeight: 600, margin: "0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ipLocation.isp || "—"}
            </p>
          </div>
        </div>
        <p style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, margin: "6px 0 0" }}>
          📡 Accuracy: {ipLocation.accuracyNote || "±1–5km"} — Circle on map shows uncertainty radius
        </p>
      </div>
    );
  }

  if (locationMode === "offline" || offlineEvent) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(185,28,28,0.1) 100%)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>📴</span>
        <div>
          <p style={{ color: "#f87171", fontWeight: 700, fontSize: 13, margin: 0 }}>
            Target is Offline — Last Known Location Shown
          </p>
          <p style={{ color: "rgba(248,113,113,0.6)", fontSize: 11, margin: "3px 0 0" }}>
            {offlineEvent?.message || "GPS and browser tab are closed. Attempting background Internet tracking..."}
          </p>
          {offlineEvent?.timestamp && (
            <p style={{ color: "rgba(248,113,113,0.4)", fontSize: 10, margin: "3px 0 0" }}>
              Went offline at {offlineEvent.timestamp.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null; // no banner when status is unknown (first load)
};

// ── GPS RESTORE NOTIFICATION ──────────────────────────────────────────────────
const GpsRestoredToast = ({ locationMode }) => {
  const prevMode = useRef(null);

  useEffect(() => {
    if (prevMode.current === "ip" && locationMode === "gps") {
      toast.success("✅ GPS Restored — Precision tracking resumed!", {
        duration: 5000,
        icon: "🛰️",
        style: {
          background: "#064e3b",
          color: "#6ee7b7",
          border: "1px solid #10b981",
        },
      });
    }
    if (prevMode.current === "gps" && locationMode === "ip") {
      toast("⚠️ GPS Offline — Switched to Internet Mode", {
        duration: 5000,
        icon: "📡",
        style: {
          background: "#431407",
          color: "#fdba74",
          border: "1px solid #f97316",
        },
      });
    }
    prevMode.current = locationMode;
  }, [locationMode]);

  return null;
};

// Need a persistent ref for prev value in a functional component

const LiveMap = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(null);
  const [addrLoading, setAddrLoading] = useState(false);

  const {
    connected,
    location,
    locationHistory,
    trackingStopped,
    error: socketError,
    // Neural Ping
    locationMode,
    sharerOnline,
    ipLocation,
    offlineEvent,
  } = useSocket(token);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTrackingByToken(token);
        setTracking(res.data.tracking);
      } catch {
        toast.error("Could not load tracking info.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    if (socketError) toast.error(socketError);
  }, [socketError]);

  // Reverse geocode GPS location updates
  const fetchAddress = useCallback(async (lat, lon) => {
    setAddrLoading(true);
    try {
      const addr = await geocodingService.reverseGeocode(lat, lon);
      setAddress(addr);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      fetchAddress(location.latitude, location.longitude);
    }
  }, [location, fetchAddress]);

  // Also geocode the initial DB position when page loads
  useEffect(() => {
    if (!address && tracking?.latitude && tracking?.longitude) {
      fetchAddress(
        parseFloat(tracking.latitude),
        parseFloat(tracking.longitude),
      );
    }
  }, [tracking, address, fetchAddress]);

  // Use live GPS location, or IP-based approximate, or last known from DB
  const activePos =
    location ||
    (tracking?.latitude && tracking?.longitude
      ? {
          latitude: parseFloat(parseFloat(tracking.latitude).toFixed(8)),
          longitude: parseFloat(parseFloat(tracking.longitude).toFixed(8)),
        }
      : null);

  // Map center: GPS > IP > last DB
  const mapCenter =
    location ||
    ipLocation ||
    (tracking?.latitude && tracking?.longitude
      ? {
          latitude: parseFloat(tracking.latitude),
          longitude: parseFloat(tracking.longitude),
        }
      : null);

  const trackingLink = `${window.location.origin}/track/${token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(trackingLink);
    toast.success("Link copied!");
  };

  const handlePing = async () => {
    const toastId = toast.loading("Sending manual ping...");
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "/api";
      const res = await fetch(`${API_BASE}/push/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ping sent — user will be notified!", { id: toastId });
      } else {
        toast.error(data.message || "Failed to send ping.", { id: toastId });
      }
    } catch {
      toast.error("Error sending ping.", { id: toastId });
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Inline keyframes for pulse animations */}
      <style>{`
        @keyframes gps-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
        }
        @keyframes ip-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(249,115,22,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(249,115,22,0); }
        }
      `}</style>

      {/* GPS Restored / Mode Change Toast Emitter */}
      <GpsRestoredToast locationMode={locationMode} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Location Map</h1>
          <p className="text-slate-400 text-sm mt-1">
            📞 {tracking?.phoneNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trackingStopped ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-red-500/10 border-red-500/30 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Session Ended
            </span>
          ) : locationMode === "gps" && sharerOnline ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GPS Live
            </span>
          ) : locationMode === "ip" ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-orange-500/10 border-orange-500/30 text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Internet Mode
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-slate-800 border-slate-700 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              {connected ? "Waiting..." : "Connecting..."}
            </span>
          )}

          {!trackingStopped && (
            <button
              onClick={handlePing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              🔔 Ping
            </button>
          )}
          <Link to="/dashboard" className="btn-secondary text-xs px-3 py-1.5">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* ── NEURAL PING STATUS BAR ─────────────────────────────────────── */}
      {!trackingStopped && (
        <NeuralPingStatusBar
          locationMode={locationMode}
          sharerOnline={sharerOnline}
          offlineEvent={offlineEvent}
          ipLocation={ipLocation}
        />
      )}

      {/* Tracking stopped banner */}
      {trackingStopped && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-2xl">🛑</span>
          <div>
            <p className="text-red-400 font-semibold text-sm">
              Tracking session ended
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              You deleted this tracking request. The sharer has been notified
              and location sharing has stopped.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">

        {/* Left Column: Map */}
        <div className="w-full lg:w-1/3 xl:w-[35%] lg:sticky lg:top-6 h-fit">
          <div
            className="card p-0 overflow-hidden shadow-2xl ring-1 ring-white/5"
            style={{
              height: "calc(100vh - 200px)",
              minHeight: "550px",
              borderColor: locationMode === "gps"
                ? "rgba(34,197,94,0.3)"
                : locationMode === "ip"
                ? "rgba(249,115,22,0.3)"
                : "rgba(99,102,241,0.2)",
              transition: "border-color 1s ease",
            }}
          >
            {mapCenter ? (
              <MapContainer
                center={[mapCenter.latitude, mapCenter.longitude]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* IP mode: show an approximate circle (1km radius) */}
                {locationMode === "ip" && ipLocation && (
                  <Circle
                    center={[ipLocation.latitude, ipLocation.longitude]}
                    radius={2000} // 2km uncertainty radius
                    pathOptions={{
                      color: "#f97316",
                      fillColor: "#f97316",
                      fillOpacity: 0.08,
                      weight: 2,
                      dashArray: "6 4",
                    }}
                  />
                )}

                {/* IP mode: marker at approximate center */}
                {locationMode === "ip" && ipLocation && (
                  <Marker
                    position={[ipLocation.latitude, ipLocation.longitude]}
                    icon={ipIcon}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <p className="font-semibold text-gray-800 mb-1">
                          📡 Internet-Based Location
                        </p>
                        <p className="text-orange-600 text-xs font-medium mb-2">
                          ⚠️ Approximate — GPS is off
                        </p>
                        <div className="space-y-1">
                          {ipLocation.city && (
                            <p className="text-gray-600 text-xs">🏙️ {ipLocation.city}</p>
                          )}
                          {ipLocation.country && (
                            <p className="text-gray-600 text-xs">🌍 {ipLocation.country}</p>
                          )}
                          {ipLocation.isp && (
                            <p className="text-gray-500 text-xs">📶 {ipLocation.isp}</p>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-2">
                          Accuracy: {ipLocation.accuracyNote || "±1–5km"}
                        </p>
                        <p className="text-gray-400 text-xs">
                          Updated: {ipLocation.timestamp?.toLocaleTimeString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* GPS mode: precise marker */}
                {activePos && locationMode === "gps" && (
                  <Marker
                    position={[activePos.latitude, activePos.longitude]}
                    icon={liveIcon}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <p className="font-semibold text-gray-800 mb-1">
                          📞 {tracking?.phoneNumber}
                        </p>
                        <p className="text-emerald-600 text-xs font-medium mb-2">
                          ✅ Precise GPS Location
                        </p>
                        {addrLoading ? (
                          <p className="text-gray-400 text-xs">Fetching address...</p>
                        ) : address ? (
                          <div className="space-y-1">
                            <p className="text-gray-700 text-xs leading-snug font-medium">
                              {address.formatted}
                            </p>
                            {address.road && (
                              <p className="text-gray-500 text-xs">🛣️ {address.road}</p>
                            )}
                            {address.area && (
                              <p className="text-gray-500 text-xs">🏘️ {address.area}</p>
                            )}
                            {address.city && (
                              <p className="text-gray-500 text-xs">🏙️ {address.city}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">
                            {activePos.latitude?.toFixed(6)},{" "}
                            {activePos.longitude?.toFixed(6)}
                          </p>
                        )}
                        <div className="bg-gray-100 rounded p-2 mt-2">
                          <p className="text-gray-600 text-xs font-mono">
                            {activePos.latitude?.toFixed(8)},{" "}
                            {activePos.longitude?.toFixed(8)}
                          </p>
                        </div>
                        {location?.accuracy && (
                          <p className="text-gray-400 text-xs mt-1">
                            GPS ±{Math.round(location.accuracy)}m
                          </p>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          {location?.timestamp
                            ? new Date(location.timestamp).toLocaleTimeString()
                            : "Last known position"}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Show last known DB position when in IP/offline mode */}
                {activePos && locationMode !== "gps" && (
                  <Marker
                    position={[activePos.latitude, activePos.longitude]}
                    icon={new L.divIcon({
                      className: "",
                      html: `<div style="
                        width:14px;height:14px;border-radius:50%;
                        background:rgba(148,163,184,0.8);border:2px solid rgba(100,116,139,0.6);
                        opacity:0.6;
                      "></div>`,
                      iconSize: [14, 14],
                      iconAnchor: [7, 7],
                    })}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold text-gray-600 mb-1">Last GPS Position</p>
                        <p className="text-gray-400 text-xs">GPS is currently off</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Movement path (GPS only) */}
                {locationHistory.length > 1 && (
                  <Polyline
                    positions={locationHistory.map((p) => [p.latitude, p.longitude])}
                    color={locationMode === "gps" ? "#22c55e" : "#6366f1"}
                    weight={3}
                    opacity={0.5}
                  />
                )}

                <MapUpdater position={location || ipLocation} />
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="text-5xl mb-4">🗺️</div>
                <p className="font-medium text-white mb-1">
                  Waiting for location...
                </p>
                <p className="text-sm">
                  Share the tracking link to start receiving location data.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tracking Details */}
        <div className="w-full lg:w-2/3 xl:w-[65%] flex flex-col gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-white/90 border-b border-white/10 pb-2">
              📍 Location Insights
            </h2>

            {/* ── Neural Ping Info Block ─────────────────────────── */}
            {locationMode === "ip" && ipLocation && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(234,88,12,0.05) 100%)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  borderRadius: 12, padding: "12px 16px",
                }}
              >
                <p style={{ color: "#f97316", fontWeight: 700, fontSize: 12, margin: "0 0 8px" }}>
                  🛰️ Internet-Mode Location Details
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <p style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, margin: 0 }}>Approx. Coordinates</p>
                    <p style={{ color: "#fdba74", fontSize: 11, fontFamily: "monospace", margin: 0 }}>
                      {ipLocation.latitude?.toFixed(4)}, {ipLocation.longitude?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, margin: 0 }}>Region</p>
                    <p style={{ color: "#fdba74", fontSize: 11, margin: 0 }}>
                      {[ipLocation.city, ipLocation.region, ipLocation.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, margin: 0 }}>Internet Provider</p>
                    <p style={{ color: "#fdba74", fontSize: 11, margin: 0 }}>{ipLocation.isp || "—"}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, margin: 0 }}>Last Updated</p>
                    <p style={{ color: "#fdba74", fontSize: 11, margin: 0 }}>
                      {ipLocation.timestamp?.toLocaleTimeString() || "—"}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${ipLocation.latitude},${ipLocation.longitude}&z=13`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 10, padding: "4px 10px",
                    background: "rgba(249,115,22,0.2)", borderRadius: 6,
                    color: "#f97316", fontSize: 11, textDecoration: "none",
                  }}
                >
                  🗺️ View Approximate Area on Maps
                </a>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
              <div className="card col-span-2 sm:col-span-3 xl:col-span-3">
                <p className="text-xs text-slate-500 mb-1">📍 Address</p>
                {locationMode === "ip" ? (
                  <p className="text-sm text-orange-400 font-medium">
                    📡 {[ipLocation?.city, ipLocation?.region, ipLocation?.country].filter(Boolean).join(", ") || "Internet-based location"}
                    <span className="text-xs text-orange-600 ml-2">(approximate)</span>
                  </p>
                ) : addrLoading ? (
                  <p className="text-xs text-indigo-400 animate-pulse">Fetching address...</p>
                ) : address?.formatted ? (
                  <p className="text-sm text-white font-medium leading-snug">{address.formatted}</p>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>

              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏢 Company</p>
                <p className="font-semibold text-white truncate">{address?.company || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏬 Building</p>
                <p className="font-semibold text-white truncate">{address?.building || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏛️ Landmark</p>
                <p className="font-semibold text-white truncate">{address?.landmark || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏙️ City</p>
                <p className="font-semibold text-white truncate">{address?.city || ipLocation?.city || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">📌 State</p>
                <p className="font-semibold text-white truncate">{address?.state || ipLocation?.region || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">Tracking Mode</p>
                <p className="font-semibold capitalize" style={{
                  color: locationMode === "gps" ? "#10b981" : locationMode === "ip" ? "#f97316" : "#94a3b8"
                }}>
                  {locationMode === "gps" ? "✅ GPS Precise" : locationMode === "ip" ? "⚠️ Internet" : "❌ Offline"}
                </p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">GPS Accuracy</p>
                <p className="font-semibold text-white">
                  {locationMode === "gps" && location?.accuracy
                    ? `±${Math.round(location.accuracy)}m`
                    : locationMode === "ip"
                    ? "±1–5km"
                    : "—"}
                </p>
              </div>
              <div className="card col-span-2 sm:col-span-2">
                <p className="text-xs text-slate-500 mb-1">
                  {locationMode === "ip" ? "Approx. Coordinates" : "Exact Coordinates"}
                </p>
                {(activePos || ipLocation) ? (
                  <>
                    <p className="font-mono text-sm text-indigo-400 mb-2">
                      {(activePos || ipLocation).latitude.toFixed(locationMode === "ip" ? 4 : 8)},{" "}
                      {(activePos || ipLocation).longitude.toFixed(locationMode === "ip" ? 4 : 8)}
                      {locationMode === "ip" && (
                        <span className="text-orange-500 text-xs ml-2">(approx.)</span>
                      )}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${(activePos || ipLocation).latitude},${(activePos || ipLocation).longitude}&z=${locationMode === "ip" ? 13 : 18}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      {locationMode === "ip" ? "View Approx. Area on Maps" : "Open in Google Maps"}
                    </a>
                  </>
                ) : (
                  <p className="font-mono text-sm text-slate-500">—</p>
                )}
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🛣️ Street</p>
                <p className="text-sm text-white truncate">{address?.road || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏘️ Area</p>
                <p className="text-sm text-white truncate">{address?.area || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">Updates</p>
                <p className="font-semibold text-white">{locationHistory.length}</p>
              </div>
            </div>
          </div>

          {/* Share link */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-white/90 border-b border-white/10 pb-2">
              🔗 Share Tracking
            </h2>
            <div className="card relative overflow-hidden border-indigo-500/10 shadow-lg group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700" />
              <p className="text-sm text-slate-400 mb-2 relative z-10">
                Tracking Link (share with target)
              </p>
              <div className="flex flex-col sm:flex-row gap-2 relative z-10">
                <input
                  readOnly
                  className="input flex-1 text-xs font-mono"
                  value={trackingLink}
                />
                <button
                  onClick={copyLink}
                  className="btn-secondary text-sm px-4 whitespace-nowrap"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
