import { useState, useEffect } from "react";
import BackButton from "../../components/common/BackButton";
import toast from "react-hot-toast";
import { getAdminTrackingSessions, deleteAdminTrackingSession } from "../../services/api";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../../components/common/LoadingScreen";

// Helper function to calculate human-readable time elapsed
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " seconds ago";
};

const AdminTracking = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'pending'
  const navigate = useNavigate();
  
  const fetchSessions = async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const res = await getAdminTrackingSessions();
      setSessions(res.data);
      if (isAuto) toast.success("Live sessions updated", { id: 'tracking-refresh', duration: 2000, position: 'top-right' });
    } catch (err) {
      toast.error("Failed to fetch tracking sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Poll every 10 seconds to keep updated location times fresh in background
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("WARNING: Are you sure you want to forcibly terminate this active live map session? The payload connection will be dropped for all clients.")) {
      return;
    }
    try {
      await deleteAdminTrackingSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      toast.success("Session proactively terminated.");
    } catch (err) {
      toast.error("Failed to delete tracking session.");
    }
  };

  const openMap = (token) => {
    navigate(`/admin/tracking/map/${token}`);
  };

  if (loading) return <LoadingScreen />;

  const filteredSessions = sessions.filter(s => filter === "all" || s.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-3">
          Global Tracking Sessions
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Monitor array of live geocoordinate payloads traversing through the platform.</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 mb-6 flex justify-between items-center shadow-sm">
        <div className="flex bg-slate-800 p-1 rounded-lg">
          {["all", "active", "pending"].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === state ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
              {state === "active" && sessions.some(s => s.status === "active") && (
                <span className="ml-2 bg-emerald-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {sessions.filter(s => s.status === "active").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">User (Owner)</th>
                <th className="px-4 py-3 font-semibold">Label / Name</th>
                <th className="px-4 py-3 font-semibold">Target Contact</th>
                <th className="px-4 py-3 font-semibold">Status / Metrics</th>
                <th className="px-4 py-3 font-semibold">Live State</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="text-4xl mb-3">📡</div>
                    No isolated payloads matching current filter schema.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3 border-r border-slate-800/50">
                      <div className="font-semibold text-sm text-slate-200">{session.user?.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{session.user?.email}</div>
                    </td>
                    
                    {/* Label */}
                    <td className="px-4 py-3 border-r border-slate-800/50">
                      <div className="font-semibold text-sm text-white">
                        {session.label || <span className="text-slate-600 font-normal text-xs italic">No Label</span>}
                      </div>
                    </td>

                    {/* Target Contact */}
                    <td className="px-4 py-3 border-r border-slate-800/50">
                      <div className="font-medium text-slate-300 flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-slate-500">📱</span> {session.phoneNumber}
                      </div>
                      <div className="text-[10px] text-indigo-400/50 mt-0.5 font-mono">{session.trackingType} mode</div>
                    </td>

                    {/* Status & Metrics */}
                    <td className="px-4 py-3 border-r border-slate-800/50">
                      {session.status === "active" ? (
                        <div className="flex items-center gap-1.5">
                           <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">Active Handshake</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                          <span className="text-xs font-medium text-yellow-400">Awaiting Target</span>
                        </div>
                      )}
                      
                      {session.status === "active" && session.latitude && (
                        <div className="mt-1.5 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded inline-block">
                          Lat: {parseFloat(session.latitude).toFixed(4)} / Lng: {parseFloat(session.longitude).toFixed(4)}
                        </div>
                      )}
                    </td>

                    {/* Live State (Time) */}
                    <td className="px-4 py-3 border-r border-slate-800/50">
                      <div className="text-[11px] text-slate-300 mb-0.5">
                         {session.status === "active" ? 'Last Pings:' : 'Idle:'}
                      </div>
                      <div className={`text-[10px] font-semibold ${session.status === "active" ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {timeAgo(session.updatedAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-col sm:flex-row">
                        <button 
                          onClick={() => openMap(session.token)}
                          className="text-xs text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                          title="Open Live Tracker UI"
                        >
                          🗺️ Map
                        </button>
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                          title="Erase DB Payload"
                        >
                          🗑️ Wipe
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTracking;
