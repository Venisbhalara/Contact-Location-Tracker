import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getAdminTrackingSessions, deleteAdminTrackingSession } from "../../services/api";
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
  
  const fetchSessions = async () => {
    try {
      const res = await getAdminTrackingSessions();
      setSessions(res.data);
    } catch (err) {
      toast.error("Failed to fetch tracking sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Poll every 10 seconds to keep updated location times fresh
    const interval = setInterval(() => {
      fetchSessions();
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
    window.open(`/tracking/map/${token}`, "_blank", "noopener,noreferrer");
  };

  if (loading) return <LoadingScreen />;

  const filteredSessions = sessions.filter(s => filter === "all" || s.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white border-l-4 border-indigo-500 pl-3">
          Global Tracking Sessions
        </h1>
        <p className="text-slate-400 mt-2">Monitor array of live geocoordinate payloads traversing through the platform.</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 mb-8 flex justify-between items-center shadow-sm">
        <div className="flex bg-slate-800 p-1 rounded-lg">
          {["all", "active", "pending"].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === state ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
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
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">User (Owner)</th>
                <th className="px-6 py-4 font-semibold">Target Contact</th>
                <th className="px-6 py-4 font-semibold">Status / Metrics</th>
                <th className="px-6 py-4 font-semibold">Live State</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="text-4xl mb-3">📡</div>
                    No isolated payloads matching current filter schema.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User */}
                    <td className="px-6 py-4 border-r border-slate-800/50">
                      <div className="font-semibold text-slate-200">{session.user?.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{session.user?.email}</div>
                    </td>
                    
                    {/* Target Contact */}
                    <td className="px-6 py-4 border-r border-slate-800/50">
                      <div className="font-medium text-white flex items-center gap-2">
                        <span className="text-slate-400">📱</span> {session.phoneNumber}
                      </div>
                      <div className="text-xs text-indigo-400/70 mt-1 font-mono">{session.trackingType} mode</div>
                    </td>

                    {/* Status & Metrics */}
                    <td className="px-6 py-4 border-r border-slate-800/50">
                      {session.status === "active" ? (
                        <div className="flex items-center gap-2">
                           <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-sm font-semibold text-emerald-400">Active Handshake</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                          <span className="text-sm font-medium text-yellow-400">Awaiting Target</span>
                        </div>
                      )}
                      
                      {session.status === "active" && session.latitude && (
                        <div className="mt-2 text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded inline-block">
                          Lat: {parseFloat(session.latitude).toFixed(4)} / Lng: {parseFloat(session.longitude).toFixed(4)}
                        </div>
                      )}
                    </td>

                    {/* Live State (Time) */}
                    <td className="px-6 py-4 border-r border-slate-800/50">
                      <div className="text-sm text-slate-300 mb-1">
                         {session.status === "active" ? 'Last Pings:' : 'Idle:'}
                      </div>
                      <div className={`text-xs font-semibold ${session.status === "active" ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {timeAgo(session.updatedAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 flex-col sm:flex-row">
                        <button 
                          onClick={() => openMap(session.token)}
                          className="text-sm text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Open Live Tracker UI"
                        >
                          🗺️ Map
                        </button>
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
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
