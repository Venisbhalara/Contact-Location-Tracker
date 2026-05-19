import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserTrackings, deleteTracking } from "../../services/api";
import toast from "react-hot-toast";

const statusBadge = (status) => {
  const map = {
    active: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      dot: "bg-emerald-400",
    },
    pending: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
      dot: "bg-amber-400",
    },
    expired: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
      dot: "bg-red-400",
    },
  };
  const s = map[status] || {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "active" ? "animate-pulse" : ""}`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [trackings, setTrackings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [tRes] = await Promise.all([getUserTrackings({ limit: 50 })]);
      setTrackings(tRes.data.trackings);
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this tracking request?")) return;
    try {
      await deleteTracking(id);
      toast.success("Tracking deleted.");
      load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const activeCount = trackings.filter((t) => t.status === "active").length;
  const pendingCount = trackings.filter((t) => t.status === "pending").length;
  const expiredCount = trackings.filter((t) => t.status === "expired").length;

  const stats = [
    {
      label: "Active Trackings",
      value: activeCount,
      icon: "📡",
      gradient: "from-emerald-500/20 to-emerald-500/5",
      color: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    {
      label: "Available Slots",
      value: user?.trackingBalance || 0,
      icon: "💳",
      gradient: "from-blue-500/20 to-indigo-500/5",
      color: "text-blue-400",
      border: "border-blue-500/20",
    },
    {
      label: "Pending Links",
      value: pendingCount,
      icon: "⏳",
      gradient: "from-amber-500/20 to-amber-500/5",
      color: "text-amber-400",
      border: "border-amber-500/20",
    },
    {
      label: "Expired Links",
      value: expiredCount,
      icon: "🔴",
      gradient: "from-red-500/20 to-red-500/5",
      color: "text-red-400",
      border: "border-red-500/20",
    },
    {
      label: "Total Created",
      value: trackings.length,
      icon: "📊",
      gradient: "from-indigo-500/20 to-purple-500/5",
      color: "text-indigo-400",
      border: "border-indigo-500/20",
    },
  ];

  if (loading)
    return (
      <div
        className="min-h-[calc(100vh-4rem)] flex items-center justify-center"
        style={{ background: "#0d0d17" }}
      >
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div
      className="min-h-[calc(100vh-4rem)] relative overflow-hidden"
      style={{ background: "#0d0d17" }}
    >
      {/* Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-40 -right-60 w-[700px] h-[700px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-indigo-400 mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Command Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
              Welcome back,{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(135deg, #a3a6ff, #c180ff)",
                }}
              >
                {user?.name?.split(" ")[0]}
              </span>
            </h1>
            <p className="text-slate-400">
              Monitor and manage your active tracking sessions.
            </p>
          </div>

          <Link
            to="/tracking/create"
            className="nextrack-btn-primary px-6 py-3 whitespace-nowrap"
          >
            <span className="mr-2 text-lg leading-none">+</span> New Tracking
            Link
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`relative rounded-2xl p-6 border ${s.border} backdrop-blur-md overflow-hidden transition-transform duration-300 hover:-translate-y-1`}
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-50`}
              />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">
                    {s.label}
                  </p>
                  <p className={`text-4xl font-bold tracking-tight ${s.color}`}>
                    {s.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl ${s.border}`}
                  style={{ background: "rgba(0,0,0,0.2)" }}
                >
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div
          className="rounded-2xl border border-white/[0.07] overflow-hidden shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            className="px-6 py-5 border-b border-white/[0.07] flex items-center justify-between"
            style={{ background: "rgba(0,0,0,0.2)" }}
          >
            <h2 className="text-lg font-semibold text-white">
              Recent Tracking Requests
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                {trackings.length} Total
              </span>
            </div>
          </div>

          {trackings.length === 0 ? (
            <div className="text-center py-20 px-4 bg-black/10">
              <div className="w-16 h-16 mx-auto rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-3xl mb-4 shadow-lg">
                📭
              </div>
              <h3 className="text-white font-medium text-lg mb-1">
                No trackings yet
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                You haven't created any location tracking links. Generate your
                first link to get started.
              </p>
              <Link
                to="/tracking/create"
                className="nextrack-btn-primary px-6 py-2.5 text-sm"
              >
                Create Tracking Link
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto nice-scrollbar bg-black/10">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase tracking-wider border-b border-white/[0.05]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium hidden sm:table-cell">
                      Expires
                    </th>
                    <th className="px-6 py-4 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {trackings.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm shadow-inner">
                            {t.label ? t.label.charAt(0).toUpperCase() : "#"}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {t.label || "Unnamed"}
                            </div>
                            <div className="text-slate-500 text-xs font-mono mt-0.5">
                              {t.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                          {t.trackingType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusBadge(t.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 hidden sm:table-cell text-xs">
                        {new Date(t.expiresAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                          {t.status !== "expired" && (
                            <Link
                              to={`/tracking/map/${t.token}`}
                              className="text-indigo-400 hover:text-indigo-300 font-medium text-xs bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded border border-indigo-500/20 transition-all hover:scale-105"
                            >
                              Live Map
                            </Link>
                          )}
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-red-400 hover:text-red-300 font-medium text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded border border-red-500/20 transition-all hover:scale-105"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
