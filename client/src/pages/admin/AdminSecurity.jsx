import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getAdminUsers, updateAdminUserAccess } from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";

// Helper function
const timeAgo = (date) => {
  if (!date) return "Never logged in";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hrs ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  if (seconds < 10) return "just now";
  return Math.floor(seconds) + " secs ago";
};

const AdminSecurity = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ban Hammer Form
  const [blockEmail, setBlockEmail] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error("Failed to load security roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    const targetEmail = blockEmail.trim().toLowerCase();
    
    // Safety check for master admin
    if (targetEmail === "vasu@gmail.com") {
      toast.error("Action Prohibited: Cannot block the Master Administrator.");
      return;
    }

    const targetUser = users.find(u => u.email.toLowerCase() === targetEmail);
    if (!targetUser) {
      toast.error(`Target not found in registry: ${targetEmail}`);
      return;
    }

    setBlockLoading(true);
    try {
      await updateAdminUserAccess(targetUser.id, { accessStatus: "revoked" });
      toast.success(`${targetEmail} has been globally blocked from the platform.`);
      setBlockEmail("");
      fetchUsers(); // Refresh live
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to execute ban sequence.");
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  // Sort lists
  const admins = users.filter(u => u.role === "admin");
  const loginAuditLog = [...users]
    .filter(u => u.lastLoginAt !== null)
    .sort((a, b) => new Date(b.lastLoginAt) - new Date(a.lastLoginAt)); // Newest first

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white border-l-4 border-red-500 pl-3">
          Security & Settings
        </h1>
        <p className="text-slate-400 mt-2">Audit administrative layers, track logins, and execute global user bans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Threat Control & Admins */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          
          {/* Ban Hammer Box */}
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white mb-2">
              <span className="text-2xl">🔨</span> Rapid Threat Control
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Identify a compromised or malicious email account to instantly sever their global access to the entire platform.
            </p>

            <form onSubmit={handleBlockSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1 block">Target Email Identity</label>
                <input
                  type="email"
                  required
                  className="input w-full bg-slate-950 border-slate-800 text-red-200 focus:border-red-500 focus:ring-red-500"
                  placeholder="suspect@target.com"
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={blockLoading || !blockEmail}
                className="btn-primary w-full bg-red-600 hover:bg-red-500 focus:ring-red-500/50 uppercase tracking-widest text-sm py-3 mt-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
              >
                {blockLoading ? "Executing..." : "Execute Global Block"}
              </button>
            </form>
          </div>

          {/* Admin Roster */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white mb-6">
              <span className="text-2xl">🛡️</span> Administrator Roster
            </h2>
            <div className="flex flex-col gap-4">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-tight">{admin.name}</p>
                    <p className="text-slate-400 font-mono text-xs">{admin.email}</p>
                  </div>
                  {admin.email === 'vasu@gmail.com' && (
                    <span className="ml-auto bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Primary</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Login Audit Log */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white mb-2">
                  <span className="text-2xl">📋</span> Global Login Diagnostics
                </h2>
                <p className="text-sm text-slate-400">Chronological timestamp matrix of latest verified entry points.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-400">{loginAuditLog.length}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Logs</p>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10">
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Identity</th>
                    <th className="px-6 py-4">Status & Role</th>
                    <th className="px-6 py-4 text-right">Entry Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loginAuditLog.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-500">
                        No login activity recorded yet on the platform.
                      </td>
                    </tr>
                  ) : (
                    loginAuditLog.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white font-medium text-sm">{user.name}</p>
                          <p className="text-slate-500 font-mono text-xs">{user.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className={`h-2.5 w-2.5 rounded-full ${user.accessStatus === 'revoked' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                             <span className="text-sm text-slate-300 capitalize">{user.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm text-indigo-300 font-medium">{timeAgo(user.lastLoginAt)}</p>
                          <p className="text-xs text-slate-600 mt-1">{new Date(user.lastLoginAt).toLocaleString()}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSecurity;
