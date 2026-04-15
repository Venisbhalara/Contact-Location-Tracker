import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createTracking, getAccessStatus, requestAccess } from "../../services/api";
import toast from "react-hot-toast";
import LoadingScreen from "../../components/common/LoadingScreen";
import useSocket from "../../hooks/useSocket";

const CreateTracking = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phoneNumber: "",
    trackingType: "location",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef(null);

  // Monitor target user's interaction
  const { location, permissionDenied } = useSocket(result?.token);

  useEffect(() => {
    if (location) {
      toast.success("Target allowed location! Redirecting to map...", { id: "redirect-toast", duration: 3000 });
      const timer = setTimeout(() => navigate(`/tracking/map/${result.token}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [location, navigate, result]);

  useEffect(() => {
    if (permissionDenied) {
      toast.error("Target rejected the location permission.", { id: "denied-toast", duration: 5000 });
    }
  }, [permissionDenied]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Access State
  const [access, setAccess] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await getAccessStatus();
        setAccess(res.data);
      } catch (err) {
        toast.error("Failed to verify access permissions.");
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAccess();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await requestAccess({ reason });
      setAccess((prev) => ({ ...prev, latestRequest: res.data.request }));
      toast.success("Access request submitted successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createTracking(form);
      setResult(res.data);
      toast.success("Tracking link created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create tracking link.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(result.trackingLink);
    toast.success("Link copied to clipboard!");
  };

  const handleClose = () => {
    if (isClosing) return;

    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      const canGoBack = window.history.state?.idx > 0;
      navigate(canGoBack ? -1 : "/dashboard");
    }, 220);
  };

  useEffect(() => {
    if (isClosing) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        const canGoBack = window.history.state?.idx > 0;
        navigate(canGoBack ? -1 : "/dashboard");
      }, 220);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isClosing, navigate]);

  if (checkingAccess) return <LoadingScreen />;

  // ─── GATEKEEPER LOGIC ─────────────────────────────────────────────
  if (!access?.trackingAccess) {
    const status = access?.latestRequest?.status;

    if (status === "pending") {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-7xl mb-6 animate-pulse">⏳</div>
          <h1 className="text-3xl font-bold text-white mb-4">Request Pending</h1>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg">
            Your request for tracking access is currently being reviewed by an administrator. Please check back later.
          </p>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-7xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-white mb-4">Request Rejected</h1>
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-xl mb-8 max-w-md mx-auto text-left shadow-lg">
            <strong className="block mb-2 text-red-300">Admin Reason:</strong> 
            {access.latestRequest.rejectionReason || "No specific reason provided."}
          </div>
          <p className="text-slate-400 mb-8">You may submit a new request if circumstances have changed.</p>
          <button onClick={() => setAccess({ ...access, latestRequest: null })} className="btn-primary w-full max-w-xs mx-auto">
            Submit New Request
          </button>
        </div>
      );
    }

    // Default Lock Form
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <div className="text-7xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-3">Access Required</h1>
          <p className="text-slate-400 text-lg">You need admin approval to use location tracking features.</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-8 border border-slate-800 shadow-2xl">
          <form onSubmit={handleRequestSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label text-slate-300">Why do you need access? (Optional)</label>
              <textarea
                className="input min-h-[120px] resize-y bg-slate-800 border-slate-700 text-slate-200 mt-2"
                placeholder="E.g., I want to track my family members for safety..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3 text-lg mt-2" disabled={loading}>
              {loading ? "Submitting..." : "Request Access"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── MAIN TRACKING GENERATOR ──────────────────────────────────────
  return (
    <div
      className={`max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-200 ease-out ${isClosing ? "opacity-0 translate-y-3 scale-[0.98] pointer-events-none" : "opacity-100 translate-y-0 scale-100"}`}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white border-l-4 border-indigo-500 pl-3">Create Tracking Link</h1>
          <p className="text-slate-400 text-sm mt-2">
            Generate a secure link that asks for location permission.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close create tracking link panel"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-slate-400 transition-all duration-200 hover:border-indigo-500 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {!result ? (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-slate-800">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="label">Phone Number *</label>
              <input
                type="text"
                className="input"
                required
                placeholder="+91 9876543210"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
              />
              <p className="text-xs text-slate-500 mt-2">
                The phone number you want to track.
              </p>
            </div>

            <div>
              <label className="label font-medium mb-3 block">Tracking Type *</label>
              <div className="grid grid-cols-1 gap-4 mt-1">
                {["location"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, trackingType: type })}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${form.trackingType === type ? "border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800"}`}
                  >
                    <div className="text-2xl mb-2">
                      {type === "location" ? "📍" : "👥"}
                    </div>
                    <div className="font-semibold capitalize text-sm">
                      {type} Tracking
                    </div>
                    <div className="text-xs mt-1 text-slate-500 line-clamp-2">
                      {type === "location"
                        ? "Capture live GPS coordinates"
                        : "Track contact activity"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
              <span className="text-yellow-500 text-xl">⚠️</span>
              <p className="text-sm text-yellow-200/80 leading-relaxed">
                The recipient must <strong>explicitly allow location access</strong> before any data is collected on the live map.
              </p>
            </div>

            <button type="submit" className="btn-primary py-3 mt-4" disabled={loading}>
              {loading ? "Generating Link..." : "Generate Tracking Link"}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 text-3xl mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Tracking Link Ready!
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Share this secure payload with your target to begin tracing.
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-5 mb-6 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Intercept Link</p>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm text-indigo-300 break-all font-mono leading-relaxed select-all">
              {result.trackingLink}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-medium mb-1">Target Identity</p>
              <p className="text-white font-semibold flex items-center gap-2">
                <span className="text-slate-400">📱</span> {result.tracking.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={copyLink} className="btn-primary flex-1 py-3 group relative overflow-hidden">
              <span className="relative font-medium flex items-center justify-center gap-2">
                <span>📋</span> Copy Link
              </span>
            </button>
            <button
              onClick={() => navigate(`/tracking/map/${result.token}`)}
              className="btn-secondary flex-1 py-3 text-slate-200 hover:text-white border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all font-medium flex items-center justify-center gap-2"
            >
              <span>🗺️</span> Open Live Map
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
             <button
              onClick={() => setResult(null)}
              className="w-full text-slate-400 hover:text-white text-sm transition-colors py-2"
            >
              ← Generate another link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTracking;
