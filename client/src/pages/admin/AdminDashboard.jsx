import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard, getAdminUserCredentials } from "../../services/api";
import LoadingScreen from "../../components/LoadingScreen";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getAdminDashboard();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
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
    return <div className="text-center text-red-500 py-12">{error}</div>;

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
      
      // Reset on success
      setFailedAttempts(0);
      localStorage.removeItem("admin_cred_attempts");
      localStorage.removeItem("admin_cred_lockout");
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem("admin_cred_attempts", newAttempts.toString());
      
      if (newAttempts >= 5) {
        const lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins
        setLockoutTime(lockUntil);
        localStorage.setItem("admin_cred_lockout", lockUntil.toString());
        toast.error("Too many failed attempts. Section locked for 15 minutes.");
      } else {
        toast.error(err.response?.data?.message || `Invalid credentials. ${5 - newAttempts} attempt(s) remaining.`);
      }
    } finally {
      setCredLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white border-l-4 border-indigo-500 pl-3">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Manage your tracking system</p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatCard
          title="Total Users Registered"
          value={data.totalUsers}
          icon={<span className="text-3xl">👥</span>}
          color="border-blue-500"
        />
        <StatCard
          title="Active Tracking Sessions"
          value={data.activeSessions}
          icon={<span className="text-3xl animate-pulse">📡</span>}
          color="border-green-500"
        />
        <StatCard
          title="Pending Approvals"
          value={data.pendingApprovals}
          icon={<span className="text-3xl">⏳</span>}
          color="border-yellow-500"
          badge={data.pendingApprovals > 0}
        />
        <StatCard
          title="Location Updates Today"
          value={data.locationUpdatesToday}
          icon={<span className="text-3xl">📍</span>}
          color="border-purple-500"
        />
        <StatCard
          title="New Signups (24h)"
          value={data.newSignups24h}
          icon={<span className="text-3xl">✨</span>}
          color="border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 p-6">
          <h2 className="text-xl font-semibold mb-6 text-white">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              to="/admin/access"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-500 text-slate-300 hover:text-indigo-400 font-medium"
            >
              <span className="text-xl">🔐</span>
              Access Requests
              {data && data.pendingApprovals > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 py-0.5 px-2 rounded-full text-xs font-bold border border-red-500/30">
                  {data.pendingApprovals} New
                </span>
              )}
            </Link>
            <Link
              to="/admin/tracking"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-500 text-slate-300 hover:text-indigo-400 font-medium"
            >
              <span className="text-xl">🗺️</span>
              All Tracking Sessions
            </Link>
            <Link
              to="/admin/live-map"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-yellow-500 text-slate-300 hover:text-yellow-400 font-bold shadow-[0_0_15px_rgba(234,179,8,0.1)]"
            >
              <span className="text-xl">🛰️</span>
              Global Live Map
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-500 text-slate-300 hover:text-indigo-400 font-medium"
            >
              <span className="text-xl">👥</span>
              Manage Users
            </Link>
            <Link
              to="/admin/security"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-red-500 text-slate-300 hover:text-red-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.05)] mt-2"
            >
              <span className="text-xl">🛡️</span>
              Security & Settings
            </Link>
            <button
              onClick={() => setShowCredModal(true)}
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-fuchsia-500 text-slate-300 hover:text-fuchsia-400 font-bold shadow-[0_0_15px_rgba(217,70,239,0.05)] mt-2 w-full text-left tracking-wide"
            >
              <span className="text-xl">🔑</span>
              Users Credentials
            </button>
            {/* <Link
              to="/contacts"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-500 text-slate-300 hover:text-indigo-400 font-medium"
            >
              <span className="text-xl">👥</span>
              Manage Contacts
            </Link> */}
            <Link
              to="/tracking/create"
              className="flex items-center gap-3 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-transparent hover:border-indigo-500 text-slate-300 hover:text-indigo-400 font-medium"
            >
              <span className="text-xl">📍</span>
              Create Tracking
            </Link>
          </div>
        </div>

        {/* Chart Section */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 p-6">
          <h2 className="text-xl font-semibold mb-6 text-white">
            Activity (Last 7 Days)
          </h2>
          <div className="flex items-end justify-between h-64 gap-2">
            {data.activityChart.map((day, i) => {
              // Calculate relative height for bars (max 10 for safe scale)
              const maxVal = Math.max(
                ...data.activityChart.map((d) =>
                  Math.max(d.signups, d.requests, 1),
                ),
              );
              const signupHeight = `${(day.signups / maxVal) * 100}%`;
              const requestHeight = `${(day.requests / maxVal) * 100}%`;

              return (
                <div
                  key={i}
                  className="flex flex-col items-center flex-1 h-full justify-end group"
                >
                  <div className="flex gap-1 items-end w-full justify-center h-full pb-2 relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {day.signups} Signups
                      <br />
                      {day.requests} Requests
                    </div>
                    {/* Signup Bar */}
                    <div
                      className="w-1/3 bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400 min-h-[4px]"
                      style={{ height: signupHeight }}
                    ></div>
                    {/* Request Bar */}
                    <div
                      className="w-1/3 bg-teal-500 rounded-t-sm transition-all duration-500 group-hover:bg-teal-400 min-h-[4px]"
                      style={{ height: requestHeight }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-6 justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Signups
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-3 h-3 bg-teal-500 rounded-full"></div> Tracking
              Requests
            </div>
          </div>
        </div>
      </div>

      {/* CREDENTIALS MODAL */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-fuchsia-500">🔑</span> Secure User
                Credentials
              </h2>
              <button
                onClick={() => {
                  setShowCredModal(false);
                  setCredentials(null);
                  setCredPassword("");
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!credentials ? (
                <form
                  onSubmit={handleFetchCredentials}
                  className="max-w-md mx-auto space-y-6 py-8"
                >
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-4">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Admin Authentication Required
                    </h3>
                    {lockoutTime ? (
                      <p className="text-red-400 mt-2 font-medium">
                        Section locked due to multiple failed attempts.
                        <br />
                        Try again in: <span className="font-mono text-lg">{Math.floor(remainingLockTime / 60)}:{(remainingLockTime % 60).toString().padStart(2, '0')}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 mt-2 text-sm">
                        Please verify your identity to access sensitive user data.
                      </p>
                    )}
                  </div>

                  <div className={`space-y-6 transition-opacity ${lockoutTime ? 'opacity-50' : 'opacity-100'}`}>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Admin Email
                      </label>
                      <input
                        type="email"
                        required
                        disabled={!!lockoutTime}
                        value={credEmail}
                        onChange={(e) => setCredEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-800/50"
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        required
                        disabled={!!lockoutTime}
                        value={credPassword}
                        onChange={(e) => setCredPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none transition-all disabled:cursor-not-allowed disabled:bg-slate-800/50"
                        placeholder="••••••••"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={credLoading || !!lockoutTime}
                      className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {lockoutTime ? "Locked" : credLoading ? "Verifying..." : "View Credentials"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <span>⚠️</span>
                      <strong>CONFIDENTIAL:</strong> You are viewing raw user
                      credentials. Do not share this information.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-800/80 text-slate-300">
                        <tr>
                          <th className="px-4 py-3 font-semibold border-b border-slate-700">
                            Name
                          </th>
                          <th className="px-4 py-3 font-semibold border-b border-slate-700">
                            Email
                          </th>
                          <th className="px-4 py-3 font-semibold border-b border-slate-700">
                            Plain Password
                          </th>
                          <th className="px-4 py-3 font-semibold border-b border-slate-700">
                            Role
                          </th>
                          <th className="px-4 py-3 font-semibold border-b border-slate-700">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
                        {credentials.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-white">
                              {user.name}
                            </td>
                            <td className="px-4 py-3">{user.email}</td>
                            <td className="px-4 py-3 font-mono text-fuchsia-400">
                              {user.password}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${user.role === "admin" ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-400"}`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {new Date(user.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Stat Card
const StatCard = ({ title, value, icon, color, badge }) => (
  <div
    className={`bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border-t-4 border-slate-800 ${color} p-6 relative overflow-hidden group hover:shadow-md transition-shadow`}
  >
    {badge && (
      <span className="absolute top-4 right-4 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
    )}
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="p-3 bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  </div>
);

export default AdminDashboard;
