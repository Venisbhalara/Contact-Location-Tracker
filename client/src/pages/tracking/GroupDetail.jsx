import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getGroupDetails,
  addGroupMember,
  removeGroupMember,
} from "../../services/api";
import toast from "react-hot-toast";

const MEMBER_COLORS = ["#22c55e","#38bdf8","#f59e0b","#fb7185","#a78bfa"];

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ phoneNumber: "", label: "" });
  const [copiedToken, setCopiedToken] = useState(null);

  const load = async () => {
    try {
      const res = await getGroupDetails(groupId);
      setGroup(res.data.group);
    } catch {
      toast.error("Failed to load group.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!form.phoneNumber.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    setAdding(true);
    try {
      const res = await addGroupMember(groupId, {
        phoneNumber: form.phoneNumber.trim(),
        label: form.label.trim() || "Member",
      });
      toast.success(`${res.data.member.label} added! Balance: ${res.data.newBalance} credits`);
      setForm({ phoneNumber: "", label: "" });
      setShowAddForm(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add member.";
      const code = err.response?.data?.code;
      if (code === "MAX_MEMBERS_REACHED") toast.error("Maximum 5 members reached!");
      else if (code === "INSUFFICIENT_BALANCE") toast.error("No tracking balance! Recharge first.");
      else toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId, label) => {
    if (!confirm(`Remove "${label}" from the group?`)) return;
    try {
      await removeGroupMember(groupId, memberId);
      toast.success(`${label} removed.`);
      load();
    } catch {
      toast.error("Failed to remove member.");
    }
  };

  const copyLink = (token, memberId) => {
    const link = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(memberId);
    toast.success("Tracking link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isExpired = group?.expiresAt && new Date() > new Date(group.expiresAt);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center" style={{ background: "#0d0d17" }}>
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center" style={{ background: "#0d0d17" }}>
        <div className="text-center">
          <p className="text-slate-400 mb-4">Group not found.</p>
          <Link to="/groups" className="nextrack-btn-primary px-4 py-2 text-sm">← Back to Groups</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" style={{ background: "#0d0d17" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to="/groups" className="hover:text-slate-300 transition-colors">Groups</Link>
          <span>/</span>
          <span className="text-slate-300 font-medium truncate">{group.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{group.name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${
                isExpired
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
                {isExpired ? "Expired" : "Active"}
              </span>
            </div>
            {group.description && <p className="text-slate-400">{group.description}</p>}
            <p className="text-slate-600 text-sm mt-1">
              ⏰ Expires: {new Date(group.expiresAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {!isExpired && (
            <Link to={`/groups/${groupId}/map`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              🗺️ Open Group Map
            </Link>
          )}
        </div>

        {/* Members Section */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden shadow-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="px-6 py-5 border-b border-white/[0.07] flex items-center justify-between"
            style={{ background: "rgba(0,0,0,0.2)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Members</h2>
              <p className="text-slate-500 text-xs mt-0.5">{group.members.length}/5 members • 1 tracking credit per member</p>
            </div>
            {!isExpired && group.members.length < 5 && (
              <button onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-medium transition-all ${
                  showAddForm
                    ? "bg-slate-700 text-slate-300"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}>
                {showAddForm ? "✕ Cancel" : "+ Add Member"}
              </button>
            )}
          </div>

          {/* Add Member Form */}
          {showAddForm && (
            <form onSubmit={handleAddMember}
              className="px-6 py-5 border-b border-white/[0.07]"
              style={{ background: "rgba(99,102,241,0.04)" }}>
              <p className="text-indigo-400 text-sm font-semibold mb-4">➕ Add New Member</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder='e.g. "Dad", "Alice", "Truck 3"'
                    maxLength={50}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>
              {/* Color preview */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-slate-500 text-xs">Auto-assigned color:</span>
                {MEMBER_COLORS.map((c, i) => {
                  const used = group.members.map((m) => m.color);
                  const isUsed = used.includes(c);
                  return (
                    <div key={c}
                      className={`w-5 h-5 rounded-full border-2 ${!isUsed && i === group.members.length ? "border-white scale-110" : "border-transparent opacity-40"}`}
                      style={{ background: c }} />
                  );
                })}
              </div>
              <button type="submit" disabled={adding}
                className="nextrack-btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                {adding ? "Adding..." : "Add Member (1 credit)"}
              </button>
            </form>
          )}

          {/* Members list */}
          {group.members.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-3xl mb-3">👥</div>
              <p className="text-slate-400 text-sm font-medium mb-1">No members yet</p>
              <p className="text-slate-600 text-xs">Click "+ Add Member" to start tracking people in this group.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {group.members.map((member, idx) => {
                const online = member.sharerOnline;
                const trackingLink = `${window.location.origin}/track/${member.token}`;

                return (
                  <div key={member.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">
                    {/* Color avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg flex-shrink-0 border-2 border-black/20"
                      style={{ background: member.color }}>
                      {member.label?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold text-sm">{member.label}</span>
                        {online ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Live
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">Offline</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs font-mono">{member.phoneNumber}</p>
                      {member.lastUpdatedAt && (
                        <p className="text-slate-700 text-xs mt-0.5">
                          Last seen: {new Date(member.lastUpdatedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    {/* Location mode badge */}
                    <div className="hidden sm:block">
                      {member.locationMode === "gps" && online ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">GPS</span>
                      ) : member.locationMode === "ip" ? (
                        <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">IP</span>
                      ) : (
                        <span className="text-xs bg-slate-500/10 text-slate-500 border border-slate-500/20 px-2 py-0.5 rounded-full">Offline</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyLink(member.token, member.id)}
                        title="Copy tracking link"
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all">
                        {copiedToken === member.id ? "✓ Copied" : "🔗 Link"}
                      </button>
                      <button
                        onClick={() => handleRemove(member.id, member.label)}
                        title="Remove member"
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-indigo-400 text-sm font-semibold mb-1">💡 How Group Tracking Works</p>
          <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
            <li>Each member gets a unique tracking link — share it with them.</li>
            <li>They open the link on their phone and allow location access.</li>
            <li>You watch everyone live on the Group Map simultaneously.</li>
            <li>Adding a member costs 1 tracking credit.</li>
            <li>Maximum 5 members per group.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
