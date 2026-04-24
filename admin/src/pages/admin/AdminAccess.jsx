import { useState, useEffect } from "react";
import BackButton from "../../components/common/BackButton";
import toast from "react-hot-toast";
import { getAdminAccessRequests, updateAdminAccessRequest } from "../../services/api";
import LoadingScreen from "../../components/common/LoadingScreen";
import { RefreshCw } from "lucide-react";

const AdminAccess = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'approved', 'rejected'
  
  // Rejection Modal State
  const [rejecting, setRejecting] = useState(null); // stores the request object to reject
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchRequests = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      const res = await getAdminAccessRequests();
      setRequests(res.data);
      if (showToast) toast.success("Queue updated successfully");
    } catch (err) {
      toast.error("Failed to load access requests queue.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    try {
      setRequests(requests.map(r => r.id === id ? { ...r, status: "approved" } : r));
      await updateAdminAccessRequest(id, { status: "approved" });
      toast.success("User access approved. Notification email dispatched!");
    } catch (err) {
      toast.error("Failed to approve access.");
      fetchRequests(); // revert
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    const id = rejecting.id;
    try {
      setRequests(requests.map(r => r.id === id ? { ...r, status: "rejected", rejectionReason } : r));
      await updateAdminAccessRequest(id, { status: "rejected", rejectionReason });
      toast.success("User access rejected. Notification email dispatched!");
      setRejecting(null);
      setRejectionReason("");
    } catch (err) {
      toast.error("Failed to reject access.");
      fetchRequests(); // revert
    }
  };

  if (loading) return <LoadingScreen />;

  const filteredRequests = requests.filter(r => filter === "all" || r.status === filter);
  
  // Sort pending first, then by date
  filteredRequests.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <BackButton />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-3">
          Access Approval Requests
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Manage the gateway restricting user tracking link generation capabilities.</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm">
        <div className="flex bg-slate-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {["all", "pending", "approved", "rejected"].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${filter === state ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
              {state === "pending" && requests.some(r => r.status === "pending") && (
                <span className="ml-2 bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {requests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchRequests(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group border border-white/10 w-full sm:w-auto justify-center"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin text-indigo-400" : "text-slate-400 group-hover:text-white transition-colors"}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-slate-400">No requests found matching your filter.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map(r => (
            <div key={r.id} className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white text-base">{r.user?.name}</h3>
                  <span className="text-sm text-slate-500 font-mono">{r.user?.email}</span>
                  {r.status === "pending" && <span className="bg-yellow-500/10 text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-yellow-500/20">Pending</span>}
                  {r.status === "approved" && <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-500/20">Approved</span>}
                  {r.status === "rejected" && <span className="bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-red-500/20">Rejected</span>}
                </div>
                
                <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-800 mt-2 inline-block min-w-[200px]">
                  <p className="text-slate-400 text-xs mb-0.5 italic">"{r.reason || "No reason provided."}"</p>
                </div>
                
                <div className="text-xs text-slate-500 mt-3">
                  Submitted: {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>

              {r.status === "pending" && (
                <div className="flex md:flex-col gap-2 w-full md:w-auto">
                  <button onClick={() => handleApprove(r.id)} className="btn-primary py-1.5 px-4 flex-1 text-xs bg-emerald-600 hover:bg-emerald-500">
                    Approve
                  </button>
                  <button onClick={() => setRejecting(r)} className="btn-secondary py-1.5 px-4 flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Reject Access Request</h2>
            <p className="text-sm text-slate-400 mb-4">
              Provide a reason for rejecting <strong>{rejecting.user?.name}</strong>. This will be shown to them on their tracking screen.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                required
                className="input min-h-[100px] resize-y bg-slate-800 border-slate-600 mb-4 w-full"
                placeholder="E.g., Missing verification details..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setRejecting(null)} className="btn-secondary flex-1 py-2">Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-2 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 border-red-500">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminAccess;
