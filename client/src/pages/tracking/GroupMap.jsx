import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { getGroupDetails } from "../../services/api";
import { useGroupSocket } from "../../hooks/useSocket";
import geocodingService from "../../services/geocodingService";
import toast from "react-hot-toast";

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Build a custom colored marker with member's first initial
const buildMemberIcon = (color, initial) =>
  new L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${color};
        border:3px solid white;
        box-shadow:0 0 0 3px ${color}66, 0 4px 12px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;font-weight:700;color:white;
        animation:member-pulse 2s ease-in-out infinite;
      ">${initial}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

// Auto-center map when a member is followed
const MapFollower = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], 16);
  }, [position, map]);
  return null;
};

// ── MEMBER SIDEBAR CARD ────────────────────────────────────────────────────────
const MemberCard = ({ member, isFollowing, onFollow, onCopyLink }) => {
  const online = member.sharerOnline;
  const hasPos = member.latitude && member.longitude;

  return (
    <div
      onClick={() => hasPos && onFollow(member.id)}
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isFollowing
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border-2"
          style={{ background: member.color, borderColor: member.color + "80" }}
        >
          {member.label?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-semibold truncate">{member.label}</span>
            {online && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            )}
          </div>
          <p className="text-slate-500 text-xs font-mono truncate">{member.phoneNumber}</p>
        </div>
        {/* Mode badge */}
        <div className="flex-shrink-0">
          {online && member.locationMode === "gps" ? (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-bold">GPS</span>
          ) : member.locationMode === "ip" ? (
            <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/25 px-1.5 py-0.5 rounded-full font-bold">IP</span>
          ) : (
            <span className="text-[10px] bg-slate-500/15 text-slate-500 border border-slate-500/25 px-1.5 py-0.5 rounded-full">—</span>
          )}
        </div>
      </div>

      {/* Last seen + coords */}
      {hasPos && (
        <p className="text-slate-600 text-[10px] mt-1.5 ml-12">
          {member.timestamp ? new Date(member.timestamp).toLocaleTimeString() : "Waiting..."}
          {" · "}
          {parseFloat(member.latitude).toFixed(4)}, {parseFloat(member.longitude).toFixed(4)}
        </p>
      )}
      {!hasPos && (
        <p className="text-slate-700 text-[10px] mt-1.5 ml-12">Waiting for location...</p>
      )}

      {/* Copy link */}
      {member.token && (
        <button
          onClick={(e) => { e.stopPropagation(); onCopyLink(member.token, member.label); }}
          className="mt-2 ml-12 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          🔗 Copy tracking link
        </button>
      )}
    </div>
  );
};

// ── MAIN GROUP MAP PAGE ────────────────────────────────────────────────────────
const GroupMap = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followingId, setFollowingId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Stores initial DB positions merged with live socket positions
  const [memberPositions, setMemberPositions] = useState({});

  const { members: socketMembers, connected, groupDeleted } = useGroupSocket(groupId);

  // Load group from API (provides initial positions + metadata)
  const loadGroup = useCallback(async () => {
    try {
      const res = await getGroupDetails(groupId);
      const g = res.data.group;
      setGroup(g);

      // Seed initial positions from DB
      const initial = {};
      for (const m of g.members) {
        initial[m.id] = {
          id: m.id,
          label: m.label,
          color: m.color,
          phoneNumber: m.phoneNumber,
          token: m.token,
          latitude: m.latitude ? parseFloat(m.latitude) : null,
          longitude: m.longitude ? parseFloat(m.longitude) : null,
          accuracy: m.accuracy,
          locationMode: m.locationMode || "offline",
          sharerOnline: m.sharerOnline || false,
          timestamp: m.lastUpdatedAt ? new Date(m.lastUpdatedAt) : null,
        };
      }
      setMemberPositions(initial);
    } catch {
      toast.error("Could not load group.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { loadGroup(); }, [loadGroup]);

  // Merge live socket updates into memberPositions
  useEffect(() => {
    if (Object.keys(socketMembers).length === 0) return;
    setMemberPositions((prev) => {
      const next = { ...prev };
      for (const [memberId, data] of Object.entries(socketMembers)) {
        const id = parseInt(memberId);
        if (next[id]) {
          next[id] = {
            ...next[id],
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            locationMode: data.locationMode,
            sharerOnline: data.sharerOnline,
            timestamp: data.timestamp,
          };
        }
      }
      return next;
    });
  }, [socketMembers]);

  // Handle group deleted event
  useEffect(() => {
    if (groupDeleted) {
      toast.error("This group has been deleted.");
      navigate("/groups");
    }
  }, [groupDeleted, navigate]);

  const copyLink = (token, label) => {
    const link = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(link);
    toast.success(`${label}'s link copied!`);
  };

  const members = Object.values(memberPositions);
  const onlineCount = members.filter((m) => m.sharerOnline).length;
  const membersWithPos = members.filter((m) => m.latitude && m.longitude);

  // Map center: average of all known positions, or first member, or India default
  const mapCenter = membersWithPos.length > 0
    ? {
        latitude: membersWithPos.reduce((s, m) => s + m.latitude, 0) / membersWithPos.length,
        longitude: membersWithPos.reduce((s, m) => s + m.longitude, 0) / membersWithPos.length,
      }
    : { latitude: 20.5937, longitude: 78.9629 }; // India

  const followingMember = followingId ? memberPositions[followingId] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a14" }}>
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0a0a14" }}>
      {/* Keyframes */}
      <style>{`
        @keyframes member-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(99,102,241,0.4), 0 4px 12px rgba(0,0,0,0.4); }
          50%  { box-shadow: 0 0 0 8px rgba(99,102,241,0.08), 0 4px 12px rgba(0,0,0,0.4); }
        }
      `}</style>

      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3">
          <Link to={`/groups/${groupId}`}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all text-sm">
            ←
          </Link>
          <div>
            <h1 className="text-white font-bold text-base leading-none">{group?.name}</h1>
            <p className="text-slate-500 text-xs mt-0.5">{members.length} members · {onlineCount} online</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
            connected
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-slate-800 border-slate-700 text-slate-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            {connected ? "Connected" : "Connecting..."}
          </span>

          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-sm transition-all"
            title="Toggle member sidebar"
          >
            {sidebarOpen ? "⊳" : "⊲"}
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── MAP ── */}
        <div className="flex-1 relative">
          {membersWithPos.length > 0 || true ? (
            <MapContainer
              center={[mapCenter.latitude, mapCenter.longitude]}
              zoom={membersWithPos.length > 0 ? 13 : 5}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Render a marker per member */}
              {members.map((member) => {
                if (!member.latitude || !member.longitude) return null;
                return (
                  <Marker
                    key={member.id}
                    position={[member.latitude, member.longitude]}
                    icon={buildMemberIcon(member.color, member.label?.charAt(0).toUpperCase())}
                    eventHandlers={{
                      click: () => setFollowingId(member.id === followingId ? null : member.id),
                    }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: member.color }}
                          >
                            {member.label?.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-semibold text-gray-800">{member.label}</p>
                        </div>
                        <p className="text-gray-500 text-xs">{member.phoneNumber}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-gray-600 text-xs">
                            📍 {parseFloat(member.latitude).toFixed(6)}, {parseFloat(member.longitude).toFixed(6)}
                          </p>
                          {member.accuracy && (
                            <p className="text-gray-400 text-xs">±{Math.round(member.accuracy)}m</p>
                          )}
                          {member.timestamp && (
                            <p className="text-gray-400 text-xs">
                              {new Date(member.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <div className={`mt-2 text-xs font-semibold ${
                          member.sharerOnline ? "text-emerald-600" : "text-gray-400"
                        }`}>
                          {member.sharerOnline ? "✅ Online — GPS Live" : "⬤ Offline — Last known"}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Follow selected member */}
              {followingId && followingMember?.latitude && (
                <MapFollower position={followingMember} />
              )}
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <div className="text-5xl mb-4">🗺️</div>
              <p className="text-white font-medium mb-1">Waiting for members...</p>
              <p className="text-sm">Share the tracking links so members can share their location.</p>
            </div>
          )}

          {/* ── FLOATING MEMBER LEGEND (bottom of map) ── */}
          {members.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:left-4 z-[1000]">
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-white/10"
                style={{ background: "rgba(10,10,20,0.85)", backdropFilter: "blur(12px)" }}>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFollowingId(m.id === followingId ? null : m.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      followingId === m.id ? "ring-1 ring-white/30 bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: m.color }}
                    />
                    <span className="text-slate-300">{m.label}</span>
                    {m.sharerOnline && (
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                ))}
                {followingId && (
                  <button
                    onClick={() => setFollowingId(null)}
                    className="text-xs text-slate-500 hover:text-slate-300 ml-1"
                  >
                    ✕ unfollow
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <div className="w-72 flex-shrink-0 border-l border-white/[0.07] flex flex-col overflow-hidden"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(16px)" }}>
            <div className="px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
              <p className="text-white font-semibold text-sm">Members</p>
              <p className="text-slate-500 text-xs">{onlineCount} of {members.length} online</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 nice-scrollbar">
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 text-sm">No members in this group.</p>
                  <Link to={`/groups/${groupId}`} className="text-indigo-400 text-xs hover:underline mt-1 block">
                    Add members →
                  </Link>
                </div>
              ) : (
                members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isFollowing={followingId === member.id}
                    onFollow={(id) => setFollowingId(id === followingId ? null : id)}
                    onCopyLink={copyLink}
                  />
                ))
              )}
            </div>

            {/* Quick actions at the bottom */}
            <div className="p-3 border-t border-white/[0.07] space-y-2 flex-shrink-0">
              <Link to={`/groups/${groupId}`}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all">
                ⚙️ Manage Members
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMap;
