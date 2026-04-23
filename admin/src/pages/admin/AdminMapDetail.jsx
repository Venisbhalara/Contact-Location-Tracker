import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
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
import BackButton from "../../components/common/BackButton";
import LoadingScreen from "../../components/common/LoadingScreen";

// Leaflet Icon Fixes
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const liveIcon = new L.divIcon({
  className: "",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#ff4757;border:3px solid #1e293b;
    box-shadow:0 0 0 4px rgba(255, 71, 87, 0.4);
    animation:pulse 1.5s ease-in-out infinite;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.latitude, position.longitude], 16, { animate: true });
  }, [position, map]);
  return null;
};

const InfoCard = ({ icon, label, value, subValue, highlight = false }) => (
  <div className={`bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl transition-all duration-300 hover:border-slate-700 group ${highlight ? 'ring-1 ring-indigo-500/30' : ''}`}>
    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      <span className="text-sm opacity-80 group-hover:scale-110 transition-transform">{icon}</span>
      <span>{label}</span>
    </div>
    <p className={`text-white font-bold leading-tight ${value?.length > 20 ? 'text-sm' : 'text-lg'}`}>
      {value || "—"}
    </p>
    {subValue && <p className="text-[10px] text-slate-500 mt-1 font-medium">{subValue}</p>}
  </div>
);

const AdminMapDetail = () => {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [updates, setUpdates] = useState(0);

  const {
    connected,
    location,
    locationHistory,
  } = useSocket(token);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTrackingByToken(token);
        setTracking(res.data.tracking);
      } catch {
        toast.error("Could not load session data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const fetchAddress = useCallback(async (lat, lon) => {
    if (addrLoading) return;
    setAddrLoading(true);
    try {
      const addr = await geocodingService.reverseGeocode(lat, lon);
      setAddress(addr);
      setUpdates(prev => prev + 1);
    } finally {
      setAddrLoading(false);
    }
  }, [addrLoading]);

  useEffect(() => {
    if (location?.latitude) {
      fetchAddress(location.latitude, location.longitude);
    } else if (tracking?.latitude && !address) {
      fetchAddress(parseFloat(tracking.latitude), parseFloat(tracking.longitude));
    }
  }, [location, tracking, address, fetchAddress]);

  if (loading) return <LoadingScreen />;

  const activePos = location || (tracking?.latitude ? {
    latitude: parseFloat(tracking.latitude),
    longitude: parseFloat(tracking.longitude)
  } : null);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 min-h-[calc(100vh-64px)]">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        .leaflet-container { border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
      `}</style>

      <div className="flex justify-between items-center">
        <BackButton to="/admin/tracking" label="Back to Dashboard" />
        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
          {connected ? 'Live Feed Active' : 'Connecting Data Link...'}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* LEFT: MAP PANEL */}
        <div className="lg:w-1/3 min-h-[500px] lg:min-h-0 flex flex-col gap-4">
           <div className="flex-1 rounded-[24px] border border-slate-800 bg-slate-900/50 relative overflow-hidden shadow-2xl">
              {activePos ? (
                <MapContainer
                  center={[activePos.latitude, activePos.longitude]}
                  zoom={16}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[activePos.latitude, activePos.longitude]} icon={liveIcon}>
                    <Popup className="admin-map-popup">
                      <div className="p-1">
                        <p className="font-bold text-red-500 mb-1">🎯 Live Position</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                            {activePos.latitude.toFixed(6)}, {activePos.longitude.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {locationHistory.length > 1 && (
                    <Polyline 
                      positions={locationHistory.map(p => [p.latitude, p.longitude])}
                      color="#ff4757"
                      weight={4}
                      opacity={0.4}
                      dashArray="8, 8"
                    />
                  )}
                  
                  <MapUpdater position={location} />
                </MapContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                   <div className="text-5xl animate-pulse">📡</div>
                   <p className="text-sm font-medium">Establishing Geospacial Link...</p>
                </div>
              )}
           </div>
        </div>

        {/* RIGHT: INSIGHTS GRID */}
        <div className="lg:w-2/3 flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📍</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Location Insights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* FULL WIDTH ADDRESS */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-[24px]">
                 <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="text-sm">📍</span> Address
                 </div>
                 {addrLoading ? (
                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium py-1">
                      <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      Resolving coordinates...
                    </div>
                 ) : (
                    <p className="text-xl font-bold text-white leading-relaxed">
                      {address?.formatted || "Awaiting precise coordinate lock..."}
                    </p>
                 )}
              </div>
            </div>

            {/* COMPANY / BUILDING / LANDMARK */}
            <InfoCard icon="🏢" label="Company" value={address?.company || "—"} />
            <InfoCard icon="🏙️" label="Building" value={address?.building || "—"} />
            <InfoCard icon="🏛️" label="Landmark" value={address?.landmark || "—"} />

            {/* CITY / STATE / MODE */}
            <InfoCard icon="🏙️" label="City" value={address?.city || "Surat"} />
            <InfoCard icon="📌" label="State" value={address?.state || "Gujarat"} />
            <div className={`bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl transition-all duration-300 hover:border-slate-700 group`}>
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>📡</span> Tracking Mode
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-red-500 text-lg">❌</span>
                    <p className="text-white font-bold text-lg">Offline</p>
                </div>
            </div>

            {/* GPS ACCURACY */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>🛰️</span> GPS Accuracy
                </div>
                <p className="text-white font-bold text-lg">
                    {location?.accuracy ? `±${Math.round(location.accuracy)} meters` : "—"}
                </p>
            </div>

            {/* COORDINATES & GOOGLE MAPS */}
            <div className="md:col-span-2 lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 p-5 rounded-[24px]">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                        <span>🔍</span> Exact Coordinates
                    </div>
                 </div>
                 <p className="text-indigo-400 font-mono text-sm mb-4">
                    {activePos?.latitude?.toFixed(8) || "0.00000000"}, {activePos?.longitude?.toFixed(8) || "0.00000000"}
                 </p>
                 <a 
                    href={activePos ? `https://www.google.com/maps?q=${activePos.latitude},${activePos.longitude}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#2d63ed] hover:bg-[#1d4ed8] text-white text-xs font-bold py-3 rounded-xl transition-all"
                 >
                    <span>📍</span> Open in Google Maps
                 </a>
            </div>

            {/* STREET / AREA / UPDATES */}
            <InfoCard icon="🗺️" label="Street" value={address?.road || "—"} />
            <InfoCard icon="🏘️" label="Area" value={address?.suburb || address?.neighbourhood || "—"} />
            <InfoCard icon="📶" label="Updates" value={updates.toString()} />

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapDetail;
