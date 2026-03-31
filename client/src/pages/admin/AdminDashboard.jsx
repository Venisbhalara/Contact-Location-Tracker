import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../../services/api";
import LoadingScreen from "../../components/LoadingScreen";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <LoadingScreen />;
  if (error)
    return <div className="text-center text-red-500 py-12">{error}</div>;

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
