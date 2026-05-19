import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserGroups, deleteGroup } from "../../services/api";
import toast from "react-hot-toast";
import CreateGroupModal from "../../components/tracking/CreateGroupModal";

const COLORS_LABEL = {
  "#22c55e": "Emerald",
  "#38bdf8": "Sky",
  "#f59e0b": "Amber",
  "#fb7185": "Rose",
  "#a78bfa": "Violet",
};

const GroupDashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await getUserGroups();
      setGroups(res.data.groups);
    } catch {
      toast.error("Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete group "${name}" and all its member sessions?`)) return;
    try {
      await deleteGroup(id);
      toast.success("Group deleted.");
      load();
    } catch {
      toast.error("Failed to delete group.");
    }
  };

  const isExpired = (expiresAt) => expiresAt && new Date() > new Date(expiresAt);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center" style={{ background: "#0d0d17" }}>
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" style={{ background: "#0d0d17" }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-40 -right-60 w-[700px] h-[700px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }} />
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(group) => {
            setShowCreate(false);
            toast.success(`Group "${group.name}" created!`);
            navigate(`/groups/${group.id}`);
          }}
        />
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-medium text-indigo-400 mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Group Tracking
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
              My{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff, #c180ff)" }}>
                Groups
              </span>
            </h1>
            <p className="text-slate-400">Track multiple people simultaneously on one live map.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              ← Dashboard
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="nextrack-btn-primary px-6 py-3 whitespace-nowrap"
            >
              <span className="mr-2 text-lg leading-none">+</span> New Group
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Total Groups", value: groups.length, icon: "👥", color: "text-indigo-400", border: "border-indigo-500/20", grad: "from-indigo-500/20 to-indigo-500/5" },
            { label: "Active Groups", value: groups.filter(g => g.status === "active" && !isExpired(g.expiresAt)).length, icon: "🟢", color: "text-emerald-400", border: "border-emerald-500/20", grad: "from-emerald-500/20 to-emerald-500/5" },
            { label: "Online Members", value: groups.reduce((acc, g) => acc + (g.activeMembers || 0), 0), icon: "📡", color: "text-sky-400", border: "border-sky-500/20", grad: "from-sky-500/20 to-sky-500/5" },
          ].map((s) => (
            <div key={s.label} className={`relative rounded-2xl p-6 border ${s.border} backdrop-blur-md overflow-hidden transition-transform duration-300 hover:-translate-y-1`}
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${s.grad} opacity-50`} />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">{s.label}</p>
                  <p className={`text-4xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl ${s.border}`}
                  style={{ background: "rgba(0,0,0,0.2)" }}>
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-2xl border border-white/[0.07]"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="w-16 h-16 mx-auto rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-3xl mb-4">👥</div>
            <h3 className="text-white font-medium text-lg mb-1">No groups yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Create a group to track family members, team, or fleet on a single live map.
            </p>
            <button onClick={() => setShowCreate(true)} className="nextrack-btn-primary px-6 py-2.5 text-sm">
              Create First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((group) => {
              const expired = isExpired(group.expiresAt);
              return (
                <div key={group.id}
                  className="relative rounded-2xl border border-white/[0.07] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 group"
                  style={{ background: "rgba(255,255,255,0.02)" }}>

                  {/* Top gradient band */}
                  <div className="h-1 w-full" style={{
                    background: expired
                      ? "linear-gradient(90deg, #374151, #1f2937)"
                      : "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)"
                  }} />

                  <div className="p-5">
                    {/* Group header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            expired
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${expired ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
                            {expired ? "Expired" : "Active"}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-lg truncate">{group.name}</h3>
                        {group.description && (
                          <p className="text-slate-500 text-xs mt-0.5 truncate">{group.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Member color dots */}
                    <div className="flex items-center gap-2 mb-4">
                      {group.members.length === 0 ? (
                        <span className="text-slate-600 text-xs">No members yet</span>
                      ) : (
                        <>
                          {group.members.map((m) => (
                            <div key={m.id} title={m.label}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-black/20 shadow"
                              style={{ background: m.color }}>
                              {m.label?.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {group.memberCount > 5 && (
                            <span className="text-slate-500 text-xs">+{group.memberCount - 5}</span>
                          )}
                        </>
                      )}
                      <span className="ml-auto text-slate-500 text-xs">
                        {group.memberCount}/{5} members
                      </span>
                    </div>

                    {/* Online indicator */}
                    {group.activeMembers > 0 && (
                      <div className="flex items-center gap-1.5 mb-4 text-emerald-400 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {group.activeMembers} member{group.activeMembers > 1 ? "s" : ""} online
                      </div>
                    )}

                    {/* Expiry */}
                    <p className="text-slate-600 text-xs mb-4">
                      {expired ? "⛔ Expired" : `⏰ Expires: `}
                      {!expired && new Date(group.expiresAt).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!expired && (
                        <Link to={`/groups/${group.id}/map`}
                          className="flex-1 text-center py-2 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                          🗺️ Live Map
                        </Link>
                      )}
                      <Link to={`/groups/${group.id}`}
                        className="flex-1 text-center py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all">
                        Manage
                      </Link>
                      <button onClick={() => handleDelete(group.id, group.name)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-sm">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDashboard;
