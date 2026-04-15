import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { getAdminTrackingSessions } from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";
import toast from "react-hot-toast";

// Ensure correct API fallback
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5005";

// Fix Leaflet blank marker bug
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Admin pin style
const activeIcon = new L.divIcon({
  className: "",
  html: `<div style="
    width:22px;height:22px;border-radius:50%;
    background:#eab308;border:3px solid #1e293b;
    box-shadow:0 0 0 3px rgba(234,179,8,0.3);
    animation:pulse 2s ease-in-out infinite;
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Auto-pan Leaflet map to targeted coords
const MapController = ({ focusPos }) => {
  const map = useMap();
  useEffect(() => {
    if (focusPos) {
      map.flyTo([focusPos.latitude, focusPos.longitude], 15, { animate: true, duration: 1.5 });
    }
  }, [focusPos, map]);
  return null;
};

const AdminLiveMap = () => {
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [focusedToken, setFocusedToken] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getAdminTrackingSessions();
        // Index by token for quick updates
        const indexed = {};
        res.data
          .filter(s => s.status === 'active' && s.latitude && s.longitude)
          .forEach((s) => {
            indexed[s.token] = {
              ...s,
              latitude: parseFloat(s.latitude),
              longitude: parseFloat(s.longitude),
              history: [{ latitude: parseFloat(s.latitude), longitude: parseFloat(s.longitude) }]
            };
          });
        setSessions(indexed);
      } catch (err) {
        toast.error("Failed to load map targets");
      } finally {
        setLoading(false);
      }
    };
    init();

    // Establish socket
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-admin-global");
    });

    // Listen to all location drops
    socketRef.current.on("admin-location-update", (data) => {
      const { token, latitude, longitude, timestamp } = data;
      setSessions(prev => {
        const existing = prev[token];
        if (!existing) return prev; // Ignore payloads not initially pulled
        
        const nextPos = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
        return {
          ...prev,
          [token]: {
            ...existing,
            ...nextPos,
            updatedAt: timestamp,
            history: [...(existing.history || []), nextPos]
          }
        };
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  if (loading) return <LoadingScreen />;

  const activeTargets = Object.values(sessions);
  const centerPos = focusedToken && sessions[focusedToken] 
    ? sessions[focusedToken] 
    : (activeTargets.length > 0 ? activeTargets[0] : { latitude: 20, longitude: 0 }); // Fallback to equator

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-white border-l-4 border-yellow-500 pl-3">
          Global Live Recon
        </h1>
        <p className="text-slate-400 mt-1">Real-time geospatial plotting of all active device handshakes.</p>
      </div>

      {/* Main Map Rig */}
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative min-h-[400px]">
        {activeTargets.length === 0 && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-5xl mb-4">💤</div>
              <p className="text-white font-semibold text-lg">No active tracking sessions</p>
              <p className="text-slate-400 mt-2">Waiting for new remote connections...</p>
            </div>
          </div>
        )}

        <MapContainer
          center={[centerPos.latitude, centerPos.longitude]}
          zoom={activeTargets.length > 0 ? 4 : 2}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {activeTargets.map(target => (
            <div key={target.token}>
              <Marker position={[target.latitude, target.longitude]} icon={activeIcon}>
                <Popup className="admin-map-popup">
                  <div className="font-sans">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                       <p className="font-bold text-indigo-600">📱 {target.phoneNumber}</p>
                       <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">Live</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Owner: <span className="text-slate-700">{target.user?.name}</span></p>
                    <p className="text-xs text-slate-500 font-medium mb-3">Ping: {new Date(target.updatedAt).toLocaleTimeString()}</p>
                    
                    <div className="bg-slate-100 rounded p-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Coordinates</p>
                      <p className="font-mono text-xs text-slate-700">{target.latitude.toFixed(6)}, {target.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Movement Trail */}
              {target.history && target.history.length > 1 && (
                <Polyline 
                  positions={target.history.map(p => [p.latitude, p.longitude])} 
                  color={focusedToken === target.token ? "#eab308" : "#475569"} 
                  weight={focusedToken === target.token ? 4 : 2}
                  opacity={focusedToken === target.token ? 0.8 : 0.4}
                />
              )}
            </div>
          ))}

          <MapController focusPos={focusedToken ? sessions[focusedToken] : null} />
        </MapContainer>
      </div>

      {/* Ground Control Target Selection */}
      <div className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Live Intercepts ({activeTargets.length})</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {activeTargets.map(target => {
            const isFocused = focusedToken === target.token;
            return (
              <div 
                key={target.token} 
                onClick={() => setFocusedToken(target.token)}
                className={`snap-start min-w-[280px] cursor-pointer transition-all duration-300 rounded-xl p-4 bg-slate-900 shadow-lg border-2 ${isFocused ? 'border-yellow-500 ring-4 ring-yellow-500/20 shadow-yellow-500/10' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <div>
                      <h3 className={`font-bold ${isFocused ? 'text-yellow-400' : 'text-white'}`}>{target.phoneNumber}</h3>
                      <p className="text-xs text-slate-500">Node ID: {target.token.slice(0,8)}</p>
                    </div>
                  </div>
                  {isFocused && <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">TRACKING</span>}
                </div>
                
                <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-800/50">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Provider</span>
                    <span className="text-slate-300 font-medium truncate max-w-[120px]">{target.user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Latency</span>
                    <span className="text-indigo-400 font-mono">
                      {Math.max(0, Math.floor((new Date() - new Date(target.updatedAt))/1000))}s ago
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default AdminLiveMap;
