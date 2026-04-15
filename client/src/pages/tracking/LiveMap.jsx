import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
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

// Live marker icon
const liveIcon = new L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:#6366f1;border:3px solid white;
    box-shadow:0 0 0 4px rgba(99,102,241,0.4);
    animation:pulse 1.5s ease-in-out infinite;
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

const LiveMap = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(null); // { formatted, road, area, city, state }
  const [addrLoading, setAddrLoading] = useState(false);

  const {
    connected,
    location,
    locationHistory,
    trackingStopped,
    error: socketError,
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

  // Reverse geocode whenever we get a new live location from the socket
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

  // Use live socket location or last known from DB
  const activePos =
    location ||
    (tracking?.latitude && tracking?.longitude
      ? {
          latitude: parseFloat(parseFloat(tracking.latitude).toFixed(8)),
          longitude: parseFloat(parseFloat(tracking.longitude).toFixed(8)),
        }
      : null);

  const trackingLink = `${window.location.origin}/track/${token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(trackingLink);
    toast.success("Link copied!");
  };

  const handlePing = async () => {
    try {
      const toastId = toast.loading("Sending ping...");
      const API_BASE = import.meta.env.VITE_API_URL || "/api";
      const res = await fetch(`${API_BASE}/push/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ping sent to user's phone!", { id: toastId });
      } else {
        toast.error(data.message || "Failed to send ping.", { id: toastId });
      }
    } catch (err) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Location Map</h1>
          <p className="text-slate-400 text-sm mt-1">
            📞 {tracking?.phoneNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {trackingStopped ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-red-500/10 border-red-500/30 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Session
              Ended
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${connected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
              />
              {connected ? "Live" : "Connecting..."}
            </span>
          )}
          {!trackingStopped && (
            <button
              onClick={handlePing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              🔔 Ping Location
            </button>
          )}
          <Link to="/dashboard" className="btn-secondary text-xs px-3 py-1.5">
            ← Dashboard
          </Link>
        </div>
      </div>

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
        
        {/* Left Column: Vertical Map */}
        <div className="w-full lg:w-1/3 xl:w-[35%] lg:sticky lg:top-6 h-fit">
          <div
            className="card p-0 overflow-hidden shadow-2xl border-indigo-500/20 ring-1 ring-white/5"
            style={{ height: "calc(100vh - 160px)", minHeight: "600px" }}
          >
            {activePos ? (
          <MapContainer
            center={[activePos.latitude, activePos.longitude]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Current position marker */}
            <Marker
              position={[activePos.latitude, activePos.longitude]}
              icon={liveIcon}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-semibold text-gray-800 mb-1">
                    📞 {tracking?.phoneNumber}
                  </p>
                  {addrLoading ? (
                    <p className="text-gray-400 text-xs">Fetching address...</p>
                  ) : address ? (
                    <div className="space-y-1">
                      <p className="text-gray-700 text-xs leading-snug font-medium">
                        {address.formatted}
                      </p>
                      {address.company && (
                        <p className="text-gray-500 text-xs">
                          🏢 {address.company}
                        </p>
                      )}
                      {address.building && (
                        <p className="text-gray-500 text-xs">
                          🏬 {address.building}
                        </p>
                      )}
                      {address.landmark && (
                        <p className="text-gray-500 text-xs">
                          🏛️ {address.landmark}
                        </p>
                      )}
                      {address.road && (
                        <p className="text-gray-500 text-xs">
                          🛣️ {address.road}
                        </p>
                      )}
                      {address.area && (
                        <p className="text-gray-500 text-xs">
                          🏘️ {address.area}
                        </p>
                      )}
                      {address.city && (
                        <p className="text-gray-500 text-xs">
                          🏙️ {address.city}
                        </p>
                      )}
                      {address.state && (
                        <p className="text-gray-500 text-xs">
                          📍 {address.state}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">
                      {activePos.latitude?.toFixed(6)},{" "}
                      {activePos.longitude?.toFixed(6)}
                    </p>
                  )}
                  {/* REPLACE WITH THIS: */}
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

            {/* Movement path */}
            {locationHistory.length > 1 && (
              <Polyline
                positions={locationHistory.map((p) => [
                  p.latitude,
                  p.longitude,
                ])}
                color="#6366f1"
                weight={3}
                opacity={0.6}
              />
            )}

            <MapUpdater position={location} />
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
            {/* Info Cards — Address focused */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
        <div className="card col-span-2 sm:col-span-3 xl:col-span-3">
          <p className="text-xs text-slate-500 mb-1">📍 Address</p>
          {addrLoading ? (
            <p className="text-xs text-indigo-400 animate-pulse">
              Fetching address...
            </p>
          ) : address?.formatted ? (
            <p className="text-sm text-white font-medium leading-snug">
              {address.formatted}
            </p>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">🏢 Company</p>
          <p className="font-semibold text-white truncate">
            {address?.company || "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">🏬 Building</p>
          <p className="font-semibold text-white truncate">
            {address?.building || "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">🏛️ Landmark</p>
          <p className="font-semibold text-white truncate">
            {address?.landmark || "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">🏙️ City</p>
          <p className="font-semibold text-white truncate">
            {address?.city || "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">📌 State</p>
          <p className="font-semibold text-white truncate">
            {address?.state || "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <p className="font-semibold text-white capitalize">
            {trackingStopped ? "Ended" : tracking?.status}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 mb-1">GPS Accuracy</p>
          <p className="font-semibold text-white">
            {location?.accuracy ? `±${Math.round(location.accuracy)}m` : "—"}
          </p>
        </div>
        <div className="card col-span-2 sm:col-span-2">
          <p className="text-xs text-slate-500 mb-1">Exact coordinates</p>
          {activePos ? (
            <>
              <p className="font-mono text-sm text-indigo-400 mb-2">
                {activePos.latitude.toFixed(8)}, {activePos.longitude.toFixed(8)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${activePos.latitude.toFixed(8)},${activePos.longitude.toFixed(8)}&z=18`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Search on Google Maps
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

    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white/90 border-b border-white/10 pb-2">
        🔗 Share Tracking
      </h2>
      {/* Share link */}
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
