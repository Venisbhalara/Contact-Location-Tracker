import { useState, useEffect, useRef, useCallback, memo, Component } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { getAdminAnalytics } from "../../services/api";
import {
  Users, Zap, Activity, Radio, ArrowUp, ArrowDown,
  X, Volume2, VolumeX, AlertTriangle, ChevronRight, BarChart2,
  Calendar, Globe, GitMerge, RefreshCw,
} from "lucide-react";

import { UserJourney } from "../../components/UserJourney";

// ─── Constants ────────────────────────────────────────────────────────────────
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";



// Map ISO2 → numeric id (subset for react-simple-maps world-atlas)
const ISO2_TO_NUMERIC = {
  IN: "356", US: "840", GB: "826", AU: "036", DE: "276",
  FR: "250", CA: "124", BR: "076", JP: "392", CN: "156",
  SG: "702", RU: "643", ZA: "710", MX: "484", IT: "380",
  ES: "724", ID: "360", KR: "410", TR: "792", AE: "784",
  PK: "586", BD: "050", EG: "818", NG: "566", AR: "032",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-white/[0.06] rounded-xl ${className}`} />
);

// ─── Animated Counter ─────────────────────────────────────────────────────────
const useCounter = (end, duration = 1800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration]);
  return count;
};

const AnimCounter = memo(({ value }) => {
  const n = useCounter(value);
  return <span>{n.toLocaleString()}</span>;
});

// ─── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline = ({ data = [], color = "#7C6FFF" }) => {
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${data.length > 1 ? (i / (data.length - 1)) * 60 : 30},${20 - (v / max) * 18}`)
    .join(" ");
  return (
    <svg width={60} height={22} viewBox="0 0 60 22">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, change, sparkData, pulse }) => {
  const positive = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-xl p-4 flex flex-col gap-2.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${color}33`,
        boxShadow: `0 0 20px ${color}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* glow blob */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[50px] pointer-events-none"
        style={{ background: `${color}25` }}
      />

      {/* header */}
      <div className="flex justify-between items-start relative z-10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        {pulse && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[9px] font-bold text-emerald-400 tracking-wider">LIVE</span>
          </span>
        )}
      </div>

      {/* value */}
      <div className="relative z-10">
        <div className="text-2xl font-bold text-white tracking-tight">
          <AnimCounter value={value} />
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 font-medium uppercase tracking-wider">{title}</div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            positive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {positive ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
          {Math.abs(change)}%
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </motion.div>
  );
};

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const signups = payload.find(p => p.dataKey === "signups")?.value ?? 0;
  const tracking = payload.find(p => p.dataKey === "trackingRequests")?.value ?? 0;
  return (
    <div
      className="rounded-xl p-3 text-sm shadow-2xl border border-white/10"
      style={{
        background: "rgba(8,13,26,0.95)",
        backdropFilter: "blur(20px)",
        minWidth: 160,
      }}
    >
      <div className="text-white/60 font-medium mb-2">{label}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#7C6FFF" }} />
        <span className="text-white/70">Signups:</span>
        <span className="text-white font-bold">{signups}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#00F5C4" }} />
        <span className="text-white/70">Tracking:</span>
        <span className="text-white font-bold">{tracking}</span>
      </div>
    </div>
  );
};

// ─── Live Event Row ───────────────────────────────────────────────────────────
const relTime = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5)   return "just now";
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const typeConfig = {
  signup:       { color: "#10B981", label: "New Signup",  dot: "#10B981" },
  login:        { color: "#3B82F6", label: "Login",        dot: "#3B82F6" },
  failed_login: { color: "#EF4444", label: "Failed Login", dot: "#EF4444" },
  tracking:     { color: "#00F5C4", label: "Tracking",     dot: "#00F5C4" },
};

const LiveRow = memo(({ event }) => {
  const cfg = typeConfig[event.type] || typeConfig.login;
  const [ts, setTs] = useState(relTime(event.time || event.createdAt));
  useEffect(() => {
    const t = setInterval(() => setTs(relTime(event.time || event.createdAt)), 10000);
    return () => clearInterval(t);
  }, [event]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: cfg.dot }} />
      </span>
      <span className="text-[10px] text-white/30 font-mono w-14 shrink-0">{ts}</span>
      <span className="text-xs font-semibold text-white/80 w-20 shrink-0 truncate">{event.label || cfg.label}</span>
      <span className="text-xs text-white/50 flex-1 truncate">{event.detail1 || "—"}</span>
    </motion.div>
  );
});



// ─── Main Component ───────────────────────────────────────────────────────────
const AdminActivity = () => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [range, setRange]         = useState("7");
  const [customRange, setCustomRange] = useState(false);
  const [liveEvents, setLiveEvents]   = useState([]);
  const [dismissed, setDismissed]     = useState([]);
  const [soundOn, setSoundOn]         = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioCtx = useRef(null);
  const socketRef = useRef(null);

  // ── Fetch analytics ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (r, isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const res = await getAdminAnalytics(r);
      setData(res.data);
      setLiveEvents(
        (res.data.liveEvents || []).map(e => ({
          ...e,
          time: e.createdAt || e.time,
        }))
      );
      if (isAuto) toast.success("Activity report updated", { id: 'activity-refresh', duration: 2000, position: 'top-right' });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(range); 
    
    // Auto-refresh every 10 seconds in background
    const interval = setInterval(() => {
      fetchData(range, true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [range, fetchData]);

  // ── Socket live feed ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join-admin-global");
      setIsConnected(true);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("live-activity", (event) => {
      setLiveEvents(prev => [{ ...event, time: event.time || new Date().toISOString() }, ...prev].slice(0, 50));
      if (soundOn) playPing();
    });
    return () => { socket.disconnect(); };
  }, [soundOn]);

  // ── ping sound ─────────────────────────────────────────────────────────────
  const playPing = () => {
    try {
      const ctx = audioCtx.current || (audioCtx.current = new (window.AudioContext || window.webkitAudioContext)());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const stats       = data?.stats        || {};
  const chartData   = data?.chartData    || [];
  const geoData     = data?.geoData      || [];
  const funnel      = data?.funnel       || [];
  const anomalies   = (data?.anomalies   || []).filter(a => !dismissed.includes(a.message));

  const journeyColors = ["#7C6FFF", "#60a5fa", "#22d3ee", "#34d399"];
  const journeyData = funnel.map((step, i) => {
    const prev = i > 0 ? funnel[i - 1].count : step.count;
    const drop = prev > 0 ? Math.round((1 - step.count / prev) * 100) : 0;
    
    let status = null;
    let dropStr = null;
    let positive = false;

    if (i === 0) {
      status = "100% baseline";
      positive = true;
    } else if (i === funnel.length - 1) {
      status = "✓ fully retained";
      positive = true;
    } else {
      dropStr = drop > 0 ? `↓ ${drop}% drop-off` : null;
      positive = false;
    }

    return {
      step: step.stage,
      count: step.count,
      color: journeyColors[i % journeyColors.length],
      drop: dropStr,
      status: status,
      positive: positive
    };
  });

  // Build geo lookup
  const geoLookup = {};
  geoData.forEach(({ country, count }) => { geoLookup[ISO2_TO_NUMERIC[country] || ""] = count; });
  const maxGeo = Math.max(...geoData.map(g => g.count), 1);
  const geoScale = scaleLinear().domain([0, maxGeo]).range(["#1a1f3a", "#7C6FFF"]);

  // Sparkline data from chartData (last N days signups)
  const mkSpark = (key) => chartData.slice(-7).map(d => d[key] || 0);

  // Gradient config for chart bars
  const SIGNUP_COLOR   = "#7C6FFF";
  const TRACKING_COLOR = "#00F5C4";

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#0a0f1e] overflow-x-hidden selection:bg-[#7C6FFF]/30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        >
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(#7C6FFF,#00F5C4)" }} />
              <h1 className="text-2xl font-bold text-white tracking-tight">Activity Report</h1>
            </div>
            <p className="text-white/40 text-xs ml-4">
              Real-time platform analytics &amp; intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(range)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-[#00F5C4]/80 hover:text-[#00F5C4] transition-colors bg-[#00F5C4]/[0.04] hover:bg-[#00F5C4]/[0.1] px-3 py-1.5 rounded-lg border border-[#00F5C4]/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 rounded-lg border border-white/[0.06]"
            >
              <ChevronRight size={12} className="rotate-180" />
              Back
            </Link>
          </div>
        </motion.div>

        {/* ── ANOMALY BANNERS ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {anomalies.map(a => (
            <motion.div
              key={a.message}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-medium"
            >
              <AlertTriangle size={16} className="shrink-0 text-amber-400 animate-pulse" />
              <span className="flex-1">{a.message}</span>
              <button
                onClick={() => setDismissed(p => [...p, a.message])}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-amber-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={stats.totalUsers || 0}
              icon={Users}
              color="#7C6FFF"
              change={stats.weeklyChange?.users || 0}
              sparkData={mkSpark("signups")}
            />
            <StatCard
              title="Today's Signups"
              value={stats.todaySignups || 0}
              icon={Zap}
              color="#3B82F6"
              change={stats.weeklyChange?.signups || 0}
              sparkData={mkSpark("signups")}
            />
            <StatCard
              title="Tracking Requests Today"
              value={stats.todayTrackingRequests || 0}
              icon={Activity}
              color="#00F5C4"
              change={stats.weeklyChange?.tracking || 0}
              sparkData={mkSpark("trackingRequests")}
            />
            <StatCard
              title="Active Now"
              value={stats.activeNow || 0}
              icon={Radio}
              color="#10B981"
              change={stats.weeklyChange?.activeNow || 0}
              sparkData={[1,1,2,1,3,2,stats.activeNow || 1]}
              pulse
            />
          </div>
        )}

        {/* ── MAIN CHART + LIVE FEED ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Chart */}
          <div
            className="xl:col-span-2 rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Chart toolbar */}
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-[#7C6FFF]" />
                <span className="font-semibold text-white">Platform Activity</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                {[
                  { label: "7 Days", val: "7" },
                  { label: "30 Days", val: "30" },
                  { label: "90 Days", val: "90" },
                ].map(btn => (
                  <button
                    key={btn.val}
                    onClick={() => { setRange(btn.val); setCustomRange(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      range === btn.val && !customRange
                        ? "bg-[#7C6FFF] text-white shadow-lg shadow-[#7C6FFF]/30"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  onClick={() => setCustomRange(v => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    customRange
                      ? "bg-[#00F5C4] text-[#0a0f1e] shadow-lg shadow-[#00F5C4]/30"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Calendar size={11} />
                  Custom
                </button>
              </div>
            </div>

            {/* Custom range input */}
            <AnimatePresence>
              {customRange && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-3 overflow-hidden"
                >
                  <span className="text-xs text-white/40">Days:</span>
                  <input
                    type="number"
                    min={3} max={365} defaultValue={14}
                    className="w-20 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:ring-1 focus:ring-[#7C6FFF]"
                    onBlur={e => { setRange(String(e.target.value)); }}
                  />
                  <button
                    onClick={() => fetchData(range)}
                    className="px-3 py-1.5 bg-[#7C6FFF] text-white text-xs rounded-lg hover:bg-[#9b8fff] transition-colors"
                  >
                    Apply
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recharts dual bar */}
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4} barCategoryGap="30%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(255,255,255,0.04)"
                    />
                    <XAxis
                      dataKey={chartData.length > 14 ? "date" : "day"}
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => chartData.length > 14 ? v.slice(5) : v}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Legend
                      formatter={(v) => (
                        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                          {v === "signups" ? "Signups" : "Tracking Requests"}
                        </span>
                      )}
                    />
                    <Bar yAxisId="left"  dataKey="signups"          name="signups"          fill={SIGNUP_COLOR}   radius={[4,4,0,0]} maxBarSize={24} isAnimationActive={true} animationDuration={800} />
                    <Bar yAxisId="right" dataKey="trackingRequests" name="trackingRequests"  fill={TRACKING_COLOR} radius={[4,4,0,0]} maxBarSize={24} isAnimationActive={true} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 justify-center pt-1">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3 h-3 rounded-sm" style={{ background: SIGNUP_COLOR }} />
                Signups <span className="text-white/20">(left axis)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <div className="w-3 h-3 rounded-sm" style={{ background: TRACKING_COLOR }} />
                Tracking Requests <span className="text-white/20">(right axis)</span>
              </div>
            </div>
          </div>

          {/* Live Feed */}
          <div
            className="rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* feed header */}
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                </span>
                <span className={`text-[10px] font-bold tracking-wider ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
                  {isConnected ? "● LIVE" : "● CONNECTING"}
                </span>
              </div>
              <button
                onClick={() => setSoundOn(v => !v)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/30 hover:text-white"
                title={soundOn ? "Mute" : "Enable sound"}
              >
                {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
            </div>

            {/* event list */}
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-0.5" style={{ maxHeight: 340, scrollbarWidth: "none" }}>
              {loading ? (
                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-9 mx-2 mb-1" />)
              ) : (
                <AnimatePresence initial={false}>
                  {liveEvents.length === 0 && (
                    <div className="text-center text-white/25 text-xs py-8">Awaiting events…</div>
                  )}
                  {liveEvents.map((ev, i) => (
                    <LiveRow key={ev.id || i} event={ev} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>


        {/* ── GEO MAP + FUNNEL ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Geo Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe size={15} className="text-[#00F5C4]" />
              <span className="font-semibold text-white">Geographic Distribution</span>
            </div>
            {loading ? (
              <Skeleton className="h-60" />
            ) : (
              <>
                <div style={{ width: "100%", height: 240 }}>
                  <ComposableMap
                    projectionConfig={{ scale: 130 }}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Geographies geography={GEO_URL}>
                      {({ geographies }) =>
                        (geographies || []).map(geo => {
                          const numId = geo.id;
                          const cnt = geoLookup[numId] || 0;
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={cnt > 0 ? geoScale(cnt) : "#1a1f33"}
                              stroke="rgba(255,255,255,0.06)"
                              strokeWidth={0.4}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  fill: cnt > 0 ? "#00F5C4" : "#2a2f4a",
                                  outline: "none",
                                  cursor: cnt > 0 ? "pointer" : "default",
                                },
                                pressed: { outline: "none" },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ComposableMap>
                </div>
                {/* Country legend */}
                {geoData.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {geoData.slice(0, 6).map(g => (
                      <div key={g.country} className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 py-1 text-xs">
                        <span className="font-bold text-[#7C6FFF]">{g.country}</span>
                        <span className="text-white/40">{g.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                {geoData.length === 0 && (
                  <p className="text-center text-white/20 text-xs mt-3">No geo data yet — requires IP tracking requests</p>
                )}
              </>
            )}
          </motion.div>

          {/* User Journey Tracker */}
          {loading ? (
            <div className="rounded-[16px] p-[28px] border border-white/[0.04] bg-[#0d1424] opacity-50 flex flex-col justify-between">
              <Skeleton className="w-full h-12 mb-4" />
              <div className="flex gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="flex-1 h-16" />)}
              </div>
            </div>
          ) : (
            <UserJourney journeyData={journeyData} />
          )}
        </div>

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-2xl text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
            <p className="text-red-400/80 mb-4 text-sm font-mono whitespace-pre-wrap">{this.state.error?.toString()}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminActivityWrapper() {
  return (
    <ErrorBoundary>
      <AdminActivity />
    </ErrorBoundary>
  );
}
