import { useState, useEffect, memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard, getAdminUserCredentials } from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Radio,
  Hourglass,
  MapPin,
  Sparkles,
  Lock,
  Map,
  Users as UsersIcon,
  Shield,
  Key,
  FileText,
  Activity,
  Server,
  Clock,
  Database,
  Network,
  HardDrive,
  AlertCircle,
  X,
  ChevronRight,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";

// --- Dynamic Dashboard Logic ---

// Reusable animated counter hook
const useCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);
  return count;
};

const AnimatedCounter = memo(({ value, duration = 2000 }) => {
  const count = useCounter(value, duration);
  return <span>{count.toLocaleString()}</span>;
});

// Optimized Clock Component to prevent dashboard-wide re-renders every second
const TopBarClock = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    return (
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(currentTime) +
      " — " +
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(currentTime)
    );
  }, [currentTime]);

  return <p className="text-sm font-mono text-[#64748B]/80">{formattedDate}</p>;
});

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); // No longer used for re-rendering root

  // User credentials modal state
  const [showCredModal, setShowCredModal] = useState(false);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [credLoading, setCredLoading] = useState(false);

  // Security Lockout State
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem("admin_cred_attempts") || "0");
  });
  const [lockoutTime, setLockoutTime] = useState(() => {
    const time = localStorage.getItem("admin_cred_lockout");
    return time ? parseInt(time) : null;
  });
  const [remainingLockTime, setRemainingLockTime] = useState(0);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showCredModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showCredModal]);

  const fetchDashboard = async (showToast = false, isAuto = false) => {
    if (!isAuto) {
      if (showToast) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const res = await getAdminDashboard();
      setData(res.data);
      setActivities(res.data.recentActivity || []);
      if (showToast || isAuto) toast.success("Dashboard refreshed", { id: 'dashboard-refresh', duration: 2000, position: 'top-right' });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin data");
      if (showToast) toast.error("Failed to refresh dashboard");
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Auto-refresh every 10 seconds in background
    const interval = setInterval(() => {
      fetchDashboard(false, true); 
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Socket.IO for Live Activity
  useEffect(() => {
    // Connect to the backend
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5000");

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      // Join the global admin room
      socket.emit("join-admin-global");
    });

    socket.on("live-activity", (event) => {
      // Unshift new activity to the start of the list, keeping max 50
      setActivities((prev) => [event, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer for lockout countdown
  useEffect(() => {
    let interval;
    if (lockoutTime) {
      interval = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutTime) {
          setLockoutTime(null);
          setFailedAttempts(0);
          localStorage.removeItem("admin_cred_lockout");
          localStorage.removeItem("admin_cred_attempts");
        } else {
          setRemainingLockTime(Math.ceil((lockoutTime - now) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTime]);

  if (loading) return <LoadingScreen />;
  if (error)
    return <div className="text-center text-[#EF4444] py-12">{error}</div>;

  const handleFetchCredentials = async (e) => {
    e.preventDefault();
    if (lockoutTime) {
      toast.error("This section is currently locked.");
      return;
    }

    setCredLoading(true);
    try {
      const res = await getAdminUserCredentials({
        email: credEmail,
        password: credPassword,
      });
      setCredentials(res.data);
      toast.success("Credentials loaded successfully");

      setFailedAttempts(0);
      localStorage.removeItem("admin_cred_attempts");
      localStorage.removeItem("admin_cred_lockout");
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem("admin_cred_attempts", newAttempts.toString());

      if (newAttempts >= 5) {
        const lockUntil = Date.now() + 15 * 60 * 1000;
        setLockoutTime(lockUntil);
        localStorage.setItem("admin_cred_lockout", lockUntil.toString());
        toast.error("Too many failed attempts. Section locked for 15 minutes.");
      } else {
        toast.error(
          err.response?.data?.message ||
            `Invalid credentials. ${5 - newAttempts} attempt(s) remaining.`,
        );
      }
    } finally {
      setCredLoading(false);
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const fadeInSlidUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#080d1a] selection:bg-[#7C6FFF]/30">
      <div className="max-w-[1400px] mx-auto px-4 w-full sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* === HEADER === */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-8 bg-[#7C6FFF] rounded-full"></div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] tracking-tight">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-[#64748B] text-lg mb-1">
              Manage your tracking system
            </p>
            <TopBarClock />
          </div>

          <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 border-r border-white/10 pr-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#10B981]"></span>
              </span>
              <span className="text-xs font-bold text-[#10B981] tracking-wider hidden sm:block">
                SYSTEM ONLINE
              </span>
            </div>
            <button
              onClick={() => fetchDashboard(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <RefreshCw
                size={16}
                className={
                  isRefreshing
                    ? "animate-spin text-[#7C6FFF]"
                    : "text-[#64748B] group-hover:text-white transition-colors"
                }
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Refreshing" : "Refresh"}
              </span>
            </button>
          </div>
        </motion.div>

        {/* === MAIN STAT CARDS === */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6"
        >
          <StatCard
            title="Total Users Registered"
            value={data?.totalUsers || 0}
            icon={Users}
            color="#7C6FFF"
            tooltip="+12 this week"
            spark={true}
          />
          <StatCard
            title="Active Sessions"
            value={data?.activeSessions || 0}
            icon={Radio}
            color="#00F5C4"
            tooltip="Live"
            pulse
            badgeText="LIVE"
          />
          <StatCard
            title="Pending Approvals"
            value={data?.pendingApprovals || 0}
            icon={Hourglass}
            color="#F59E0B"
            tooltip="Requires attention"
            glow={data?.pendingApprovals > 0}
          />
          <StatCard
            title="Location Updates Today"
            value={data?.locationUpdatesToday || 0}
            icon={MapPin}
            color="#EF4444"
            tooltip="Last change: 2m ago"
          />
          <StatCard
            title="New Signups (24h)"
            value={data?.newSignups24h || 0}
            icon={Sparkles}
            color="#3B82F6"
            tooltip="+14% vs yesterday"
          />
        </motion.div>

        {/* === MINI STATS ROW === */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { l: "Avg Session Duration", v: "4m 32s" }, // Mocked for display
            { l: "Total Track Requests", v: data?.totalTrackRequests || 0 },
            { l: "Success Rate", v: `${data?.successRate || 0}%` },
            { l: "Banned Users", v: data?.bannedUsers || 0 },
          ].map((s, i) => (
            <div
              key={i}
              className="glass-card px-5 py-4 flex flex-col justify-center transition-all hover:bg-white/[0.04]"
            >
              <span className="text-xs text-[#64748B] font-medium uppercase tracking-wider mb-1">
                {s.l}
              </span>
              <span className="text-xl font-bold text-white tracking-tight">
                {s.v}
              </span>
            </div>
          ))}
        </motion.div>

        {/* === MIDDLE SECTION: LIVE FEED & CHARTS === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Feed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 glass-card flex flex-col h-[400px]"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3B82F6]"></span>
              </span>
              <h2 className="text-lg font-bold text-white">Live Activity</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 nice-scrollbar">
              <AnimatePresence>
                {activities.length === 0 && (
                  <div className="p-4 text-center text-[#64748B] text-sm italic">
                    Waiting for live activity...
                  </div>
                )}
                {activities.map((event, i) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                      delay: i < 10 ? 0.05 * i : 0,
                    }}
                    key={event.id || i}
                    className={`flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] cursor-pointer transition-colors border-l-2 ${event.color} bg-white/[0.01]`}
                  >
                    <div className="w-16 text-xs text-[#64748B] font-mono shrink-0">
                      {event.time === "just now"
                        ? "just now"
                        : new Date(event.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </div>
                    <div className="w-32 text-sm font-semibold text-white truncate flex items-center gap-2">
                      {event.alert && (
                        <AlertCircle size={14} className="text-[#EF4444]" />
                      )}
                      {event.label}
                    </div>
                    <div className="flex-1 text-sm text-[#F1F5F9] truncate">
                      {event.detail1}
                    </div>
                    <div className="w-32 text-sm text-[#64748B] text-right truncate hidden sm:block">
                      {event.detail2}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="p-3 border-t border-white/[0.06] text-center">
              <button className="text-sm font-medium text-[#64748B] hover:text-white transition-colors">
                View All Activity →
              </button>
            </div>
          </motion.div>

          {/* Donut Charts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-6 flex flex-col gap-6 h-[400px]"
          >
            <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-3 mb-2">
              Metrics Overview
            </h2>

            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Chart 1 */}
              <div className="flex flex-col items-center">
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Active",
                            value: data?.activeSessions || 0,
                            color: "#10B981",
                          },
                          {
                            name: "Offline",
                            value: data?.offlineSessions || 0,
                            color: "#F59E0B",
                          },
                          {
                            name: "Expired",
                            value: data?.expiredSessions || 0,
                            color: "#64748B",
                          },
                        ]}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {[
                          {
                            name: "Active",
                            value: data?.activeSessions || 0,
                            color: "#10B981",
                          },
                          {
                            name: "Offline",
                            value: data?.offlineSessions || 0,
                            color: "#F59E0B",
                          },
                          {
                            name: "Expired",
                            value: data?.expiredSessions || 0,
                            color: "#64748B",
                          },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: "#080d1a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <span className="text-xs font-semibold text-white mt-2">
                  Session Status
                </span>
              </div>

              {/* Chart 2 */}
              <div className="flex flex-col items-center">
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Standard",
                            value: data?.standardUsers || 0,
                            color: "#3B82F6",
                          },
                          {
                            name: "Admins",
                            value: data?.adminUsers || 0,
                            color: "#7C6FFF",
                          },
                          {
                            name: "Banned",
                            value: data?.bannedUsers || 0,
                            color: "#EF4444",
                          },
                        ]}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {[
                          {
                            name: "Standard",
                            value: data?.standardUsers || 0,
                            color: "#3B82F6",
                          },
                          {
                            name: "Admins",
                            value: data?.adminUsers || 0,
                            color: "#7C6FFF",
                          },
                          {
                            name: "Banned",
                            value: data?.bannedUsers || 0,
                            color: "#EF4444",
                          },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: "#080d1a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <span className="text-xs font-semibold text-white mt-2">
                  User Types
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* === QUICK ACTIONS GRID === */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Quick Actions
            </h2>
            <p className="text-[#64748B] text-sm">
              Navigate to key management areas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard
              to="/admin/access"
              icon={Lock}
              title="Access Requests"
              desc="Review and approve requests"
              color="#F59E0B"
              badge={
                data?.pendingApprovals > 0
                  ? `${data?.pendingApprovals} Pending`
                  : null
              }
            />
            <ActionCard
              to="/admin/tracking"
              icon={Radio}
              title="All Tracking"
              desc="Monitor historical sessions"
              color="#00F5C4"
            />
            <ActionCard
              to="/admin/live-map"
              icon={Map}
              title="Global Live Map"
              desc="Real-time visualization"
              color="#3B82F6"
              badge="LIVE"
              pulseBadge
            />
            <ActionCard
              to="/admin/users"
              icon={UsersIcon}
              title="Manage Users"
              desc="Edit or suspend accounts"
              color="#7C6FFF"
            />
            <ActionCard
              to="/admin/security"
              icon={Shield}
              title="Security & Settings"
              desc="Firewall & auth config"
              color="#EF4444"
            />
            <ActionCard
              onClick={() => setShowCredModal(true)}
              icon={Key}
              title="Users Credentials"
              desc="Passwords and keys"
              color="#EAB308"
            />
            <ActionCard
              to="/admin/activity"
              icon={FileText}
              title="Activity Report"
              desc="Export usage data"
              color="#10B981"
            />
          </div>
        </motion.div>
      </div>

      {/* --- CREDENTIALS MODAL --- */}
      <AnimatePresence>
        {showCredModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080d1a]/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              {/* Modal Blur Accents */}
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#7C6FFF]/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#EAB308]/10 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center relative z-10 bg-black/20">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAB308]/20 flex items-center justify-center border border-[#EAB308]/30">
                    <LockKeyhole className="text-[#EAB308]" size={20} />
                  </div>
                  Secure Vault Access
                </h2>
                <button
                  onClick={() => {
                    setShowCredModal(false);
                    setCredentials(null);
                    setCredPassword("");
                  }}
                  className="p-2 text-[#64748B] hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto relative z-10 nice-scrollbar">
                {!credentials ? (
                  <form
                    onSubmit={handleFetchCredentials}
                    className="max-w-md mx-auto space-y-6 py-12"
                  >
                    <div className="text-center mb-10">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#EF4444]/10 text-[#EF4444] mb-6 border border-[#EF4444]/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                        <Shield size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        Authentication Required
                      </h3>
                      {lockoutTime ? (
                        <p className="text-[#EF4444] mt-3 font-medium">
                          Security lockout active due to failed attempts.
                          <br />
                          Try again in:{" "}
                          <span className="font-mono text-lg font-bold">
                            {Math.floor(remainingLockTime / 60)}:
                            {(remainingLockTime % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[#64748B] mt-2">
                          Verify identity to access sensitive credentials.
                        </p>
                      )}
                    </div>

                    <div
                      className={`space-y-5 transition-opacity ${lockoutTime ? "opacity-50" : "opacity-100"}`}
                    >
                      <div>
                        <label className="block text-sm font-medium text-[#64748B] mb-2 uppercase tracking-wider">
                          Admin Email
                        </label>
                        <input
                          type="email"
                          required
                          disabled={!!lockoutTime}
                          value={credEmail}
                          onChange={(e) => setCredEmail(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-[#EAB308] focus:border-transparent outline-none transition-all disabled:opacity-50 font-mono"
                          placeholder="admin@system.io"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#64748B] mb-2 uppercase tracking-wider">
                          Master Password
                        </label>
                        <input
                          type="password"
                          required
                          disabled={!!lockoutTime}
                          value={credPassword}
                          onChange={(e) => setCredPassword(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-[#EAB308] focus:border-transparent outline-none transition-all disabled:opacity-50 font-mono tracking-widest"
                          placeholder="••••••••"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={credLoading || !!lockoutTime}
                        className="w-full bg-[#EAB308] hover:bg-[#FACC15] disabled:bg-white/10 disabled:text-[#64748B] text-[#080d1a] font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:-translate-y-1 mt-6"
                      >
                        {lockoutTime
                          ? "LOCKED OUT"
                          : credLoading
                            ? "CHECKING..."
                            : "AUTHORIZE ACCESS"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-5 flex items-start gap-4">
                      <div className="p-2 bg-[#EF4444]/20 rounded-lg shrink-0">
                        <AlertCircle className="text-[#EF4444]" size={24} />
                      </div>
                      <div>
                        <h4 className="text-[#EF4444] font-bold mb-1">
                          STRICTLY CONFIDENTIAL
                        </h4>
                        <p className="text-[#EF4444]/80 text-sm leading-relaxed">
                          You are viewing raw, unencrypted user credentials.
                          This session is being logged. Do not distribute or
                          screenshot this information under any circumstances.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden backdrop-blur-xl">
                      <div className="overflow-x-auto nice-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-white/5 text-[#F1F5F9]">
                            <tr>
                              <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs border-b border-white/10">
                                User Identity
                              </th>
                              <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs border-b border-white/10">
                                Email Address
                              </th>
                              <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs border-b border-white/10 text-[#EAB308]">
                                Plain Password
                              </th>
                              <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs border-b border-white/10">
                                System Role
                              </th>
                              <th className="px-5 py-4 font-bold tracking-wider uppercase text-xs border-b border-white/10">
                                Entry Date
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-[#64748B]">
                            {credentials.map((user) => (
                              <tr
                                key={user.id}
                                className="hover:bg-white/[0.02] transition-colors group"
                              >
                                <td className="px-5 py-4 font-medium text-white flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white group-hover:bg-[#7C6FFF]/20 group-hover:text-[#7C6FFF] transition-colors border border-white/10">
                                    {user.name ? user.name.charAt(0).toUpperCase() : (user.email.charAt(0).toUpperCase())}
                                  </div>
                                  {user.name}
                                </td>
                                <td className="px-5 py-4 font-mono text-xs">
                                  {user.email}
                                </td>
                                <td className="px-5 py-4 font-mono text-[#EAB308] bg-[#EAB308]/5 px-5">
                                  {user.password}
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.role === "admin" ? "bg-[#7C6FFF]/10 text-[#7C6FFF] border-[#7C6FFF]/20" : "bg-white/5 text-[#64748B] border-white/10"}`}
                                  >
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-xs">
                                  {new Date(user.joinedAt).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub Components ---

const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    color,
    tooltip,
    glow,
    pulse,
    badgeText,
    spark,
  }) => (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4 }}
      className="relative glass-card p-5 group transition-all duration-300 overflow-hidden"
      style={{
        borderTop: `2px solid ${color}`,
        boxShadow: glow ? `0 0 20px ${color}33` : "none",
      }}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
        <Icon size={100} color={color} />
      </div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300"
          style={{
            backgroundColor: `${color}15`,
            borderColor: `${color}30`,
            color: color,
          }}
        >
          <Icon size={20} />
        </div>
        {badgeText && (
          <span
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider border"
            style={{
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              color: color,
            }}
          >
            {pulse && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              ></span>
            )}
            {badgeText}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-white text-3xl font-black tracking-tight mb-1">
          <AnimatedCounter value={value} />
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#64748B] truncate">{title}</p>
          <div className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/50 truncate max-w-[80px]">
            {tooltip}
          </div>
        </div>
      </div>
    </motion.div>
  ),
);

const ActionCard = memo(
  ({ to, onClick, icon: Icon, title, desc, color, badge, pulseBadge }) => {
    const content = (
      <div
        className="glass-card p-5 flex items-center gap-4 group cursor-pointer relative overflow-hidden transition-all duration-300 hover:shadow-2xl"
        style={{ "--hover-color": color }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-r from-transparent to-[var(--hover-color)] pointer-events-none"></div>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110"
          style={{
            backgroundColor: `${color}15`,
            borderColor: `${color}30`,
            color: color,
            boxShadow: `0 0 20px ${color}20`,
          }}
        >
          <Icon size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-white truncate group-hover:text-[var(--hover-color)] transition-colors">
            {title}
          </h4>
          <p className="text-xs text-[#64748B] truncate mt-0.5">{desc}</p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {badge && (
            <span
              className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider border flex items-center gap-1.5"
              style={{
                backgroundColor: `${color}15`,
                borderColor: `${color}30`,
                color: color,
              }}
            >
              {pulseBadge && (
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                ></span>
              )}
              {badge}
            </span>
          )}
          <ChevronRight
            className="text-[#64748B] group-hover:text-white group-hover:translate-x-1 transition-all"
            size={20}
          />
        </div>
      </div>
    );

    return to ? (
      <Link
        to={to}
        className="block w-full outline-none focus:ring-2 focus:ring-[#7C6FFF] rounded-xl"
      >
        {content}
      </Link>
    ) : (
      <div onClick={onClick} className="w-full relative">
        {content}
      </div>
    );
  },
);

export default AdminDashboard;
