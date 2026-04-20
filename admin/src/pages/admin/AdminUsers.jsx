import { useState, useEffect } from "react";
import BackButton from "../../components/common/BackButton";
import toast from "react-hot-toast";
import { 
  getAdminUsers, 
  updateAdminUserRole, 
  updateAdminUserAccess, 
  deleteAdminUser 
} from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  const fetchUsers = async () => {
    try {
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (user, newRole) => {
    const originalUsers = [...users];
    try {
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      await updateAdminUserRole(user.id, { role: newRole });
      toast.success(`${user.name} is now ${newRole}`);
    } catch (err) {
      setUsers(originalUsers);
      toast.error(err.response?.data?.message || "Role change failed");
    }
  };

  const handleAccessChange = async (user, newAccess) => {
    const originalUsers = [...users];
    try {
      setUsers(users.map(u => u.id === user.id ? { ...u, accessStatus: newAccess } : u));
      await updateAdminUserAccess(user.id, { accessStatus: newAccess });
      toast.success(`${user.name}'s access ${newAccess}`);
    } catch (err) {
      setUsers(originalUsers);
      toast.error(err.response?.data?.message || "Access change failed");
    }
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteAdminUser(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success("User deleted permanently");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setUserToDelete(null);
    }
  };

  // Derived state for rendering
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesAccess = accessFilter === "all" || u.accessStatus === accessFilter;
    return matchesSearch && matchesRole && matchesAccess;
  });

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white border-l-4 border-indigo-500 pl-3">
          Manage Users
        </h1>
        <p className="text-slate-400 mt-2">View, modify, and control access for all user accounts.</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <input 
          type="text" 
          placeholder="🔍 Search name or email..." 
          className="w-full md:w-1/3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="flex w-full md:w-auto gap-4">
          <select 
            className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          
          <select 
            className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
          >
            <option value="all">All Access</option>
            <option value="approved">Approved</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Sessions</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Access Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isMasterAdmin = u.email === "vasu@gmail.com";
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-sm text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          {u.sessionCount} Sessions
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          disabled={isMasterAdmin}
                          value={u.role || "user"}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className={`text-sm rounded-lg px-2 py-1 outline-none border ${isMasterAdmin ? "bg-transparent border-transparent text-slate-500 appearance-none pointer-events-none" : "bg-slate-800 border-slate-700 text-slate-300 focus:border-indigo-500"}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={isMasterAdmin}
                          onClick={() => handleAccessChange(u, u.accessStatus === "approved" ? "revoked" : "approved")}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            u.accessStatus === "approved" ? 'bg-indigo-500' : 'bg-slate-700'
                          } ${isMasterAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              u.accessStatus === "approved" ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`ml-3 text-sm ${u.accessStatus === "approved" ? "text-indigo-400" : "text-slate-500"}`}>
                          {u.accessStatus === "approved" ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          disabled={isMasterAdmin}
                          onClick={() => confirmDelete(u)}
                          className={`text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10 ${isMasterAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={isMasterAdmin ? "Cannot delete master admin" : "Delete User Permanently"}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setUserToDelete(null)}
          ></div>
          <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-md w-full transform transition-all text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20 shadow-inner shadow-red-500/20">
              <svg className="h-8 w-8 text-red-500 opacity-90 drop-shadow-md" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Delete User Record</h3>
            <p className="text-slate-400 mb-8 leading-relaxed text-sm">
              Are you absolutely sure you want to delete <span className="text-red-400 font-semibold">{userToDelete.name}</span>? 
              This action cannot be undone and will permanently erase all associated data and tracking history.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                type="button"
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors border border-slate-700/50"
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all shadow-lg shadow-red-500/25 border border-red-500/20"
                onClick={executeDelete}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
