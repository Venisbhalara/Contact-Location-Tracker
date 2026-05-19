import { useState, useEffect } from "react";
import BackButton from "../../components/common/BackButton";
import toast from "react-hot-toast";
import {
  getAdminUsers,
  getAdminPayments,
  updateAdminUserBalance,
} from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";
import {
  CreditCard,
  Users,
  History,
  Plus,
  Minus,
  Search,
  Wallet,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AdminMonetization = () => {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState("add"); // "add" or "reduce"
  const [addAmount, setAddAmount] = useState("");
  const [updateReason, setUpdateReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [uRes, pRes] = await Promise.all([
        getAdminUsers(),
        getAdminPayments(),
      ]);
      setUsers(uRes.data);
      setPayments(pRes.data);
      if (isManual) toast.success("Data refreshed", { id: "refresh-success" });
    } catch (err) {
      toast.error("Failed to load monetization data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (user, mode) => {
    setSelectedUser(user);
    setModalMode(mode);
    setAddAmount("");
    setUpdateReason("");
  };

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!selectedUser || !addAmount) return;

    setUpdating(true);
    try {
      // If mode is reduce, make amount negative
      const amount =
        modalMode === "reduce"
          ? -Math.abs(parseFloat(addAmount))
          : Math.abs(parseFloat(addAmount));

      const res = await updateAdminUserBalance(selectedUser.id, {
        amount: amount,
        reason: updateReason,
      });

      if (res.data.success) {
        toast.success(
          `${modalMode === "add" ? "Added" : "Reduced"} slots for ${selectedUser.name}`,
        );
        setUsers(
          users.map((u) =>
            u.id === selectedUser.id
              ? { ...u, trackingBalance: res.data.newBalance }
              : u,
          ),
        );
        setSelectedUser(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update balance");
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredPayments = payments.filter(
    (p) =>
      p.user?.name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.orderId?.toLowerCase().includes(paymentSearch.toLowerCase()),
  );

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const totalSlotsAllocated = users.reduce(
    (sum, u) => sum + (u.trackingBalance || 0),
    0,
  );

  if (loading) return <LoadingScreen />;

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
      style={{ background: "#0d0d17", minHeight: "100vh" }}
    >
      <div className="flex justify-between items-start mb-8 mt-2">
        <div>
          <BackButton />
          <div className="flex items-center gap-3 mt-3">
            <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              Monetization Hub
            </h1>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 group shadow-xl"
          title="Refresh Data"
        >
          <RefreshCw
            size={20}
            className={`${refreshing ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
            {refreshing ? "Refreshing..." : "Refresh Hub"}
          </span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            label: "Total Revenue",
            value: `₹${totalRevenue.toLocaleString()}`,
            icon: CreditCard,
            color: "text-emerald-400",
            bg: "from-emerald-500/15 to-emerald-500/5",
            border: "border-emerald-500/20",
          },
          {
            label: "Active Slots",
            value: totalSlotsAllocated,
            icon: Wallet,
            color: "text-indigo-400",
            bg: "from-indigo-500/15 to-indigo-500/5",
            border: "border-indigo-500/20",
          },
          {
            label: "Paid Transactions",
            value: payments.filter((p) => p.status === "paid").length,
            icon: History,
            color: "text-purple-400",
            bg: "from-purple-500/15 to-purple-500/5",
            border: "border-purple-500/20",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={`relative p-7 rounded-3xl border ${s.border} bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-30`}
            />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mb-2">
                  {s.label}
                </p>
                <h3 className={`text-2xl font-black ${s.color} tracking-tight`}>
                  {s.value}
                </h3>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-black/40 border ${s.border}`}
              >
                <s.icon className={s.color} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit mb-8 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "users" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-white"}`}
        >
          <Users size={16} />
          User Balances
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-7 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === "payments" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-white"}`}
        >
          <History size={16} />
          Payment Records
        </button>
      </div>

      {/* Content Section */}
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-black/20">
          <div className="relative flex-1">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab === "users" ? "by name or email" : "by user, email or order ID"}...`}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-14 pr-6 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-all font-medium"
              value={activeTab === "users" ? userSearch : paymentSearch}
              onChange={(e) =>
                activeTab === "users"
                  ? setUserSearch(e.target.value)
                  : setPaymentSearch(e.target.value)
              }
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "users" ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-white/5">
                  <th className="px-8 py-5">User Profile</th>
                  <th className="px-8 py-5">Plan</th>
                  <th className="px-8 py-5 text-center">Balance</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-8 py-16 text-center text-slate-600 font-medium"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-base">
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="text-white font-bold text-base">
                              {u.name}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${u.planType === "premium" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}
                        >
                          {u.planType || "Free"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="text-xl font-black text-white">
                          {u.trackingBalance || 0}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(u, "add")}
                            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            Add
                          </button>
                          <button
                            onClick={() => openModal(u, "reduce")}
                            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          >
                            <Minus size={14} />
                            Reduce
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] border-b border-white/5">
                  <th className="px-8 py-5">Transaction Details</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-8 py-16 text-center text-slate-600 font-medium"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                            <ArrowUpRight size={18} />
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm">
                              {p.user?.name || "Unknown"}
                            </div>
                            <div className="text-slate-500 text-[11px] truncate max-w-[150px] font-mono">
                              {p.orderId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-emerald-400 font-black text-lg">
                        ₹{p.amount}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="text-white font-bold text-xs">
                          {new Date(p.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold mt-0.5">
                          {new Date(p.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Adjustment Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 overflow-hidden shadow-2xl"
              style={{ background: "rgba(20,20,30,0.98)" }}
            >
              <div
                className={`absolute -top-24 -right-24 w-48 h-48 ${modalMode === "add" ? "bg-indigo-500/10" : "bg-red-500/10"} blur-[80px] rounded-full`}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div
                    className={`w-14 h-14 ${modalMode === "add" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-red-500/10 border-red-500/20 text-red-400"} border rounded-2xl flex items-center justify-center text-3xl`}
                  >
                    {modalMode === "add" ? "⚡" : "🛡️"}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {modalMode === "add"
                        ? "Add Tracking Slots"
                        : "Reduce Tracking Slots"}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold tracking-wider">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>
                <form onSubmit={handleUpdateBalance} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">
                      Quantity
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 10"
                      className={`w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-2xl font-black ${modalMode === "add" ? "text-indigo-400" : "text-red-400"} outline-none focus:border-indigo-500 transition-all shadow-inner`}
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3">
                      Reason for Adjustment
                    </label>
                    <textarea
                      placeholder="Write a reason..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white ${modalMode === "add" ? "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/30" : "bg-red-500 hover:bg-red-400 shadow-red-500/30"} shadow-xl transition-all`}
                    >
                      {updating
                        ? "Processing..."
                        : modalMode === "add"
                          ? "Add Slots"
                          : "Reduce Slots"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMonetization;
