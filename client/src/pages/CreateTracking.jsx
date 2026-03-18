import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTracking } from "../services/api";
import toast from "react-hot-toast";

const CreateTracking = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phoneNumber: "",
    trackingType: "location",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createTracking(form);
      setResult(res.data);
      toast.success("Tracking link created!");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to create tracking link.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(result.trackingLink);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Create Tracking Link</h1>
        <p className="text-slate-400 text-sm mt-1">
          Generate a secure link that asks for location permission.
        </p>
      </div>

      {!result ? (
        <div className="card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="label">Phone Number *</label>
              <input
                className="input"
                required
                placeholder="+91 9876543210"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                The phone number you want to track.
              </p>
            </div>

            <div>
              <label className="label">Tracking Type *</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {["location", "contact"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, trackingType: type })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${form.trackingType === type ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}
                  >
                    <div className="text-xl mb-1">
                      {type === "location" ? "📍" : "👥"}
                    </div>
                    <div className="font-medium capitalize">
                      {type} Tracking
                    </div>
                    <div className="text-xs mt-0.5 text-slate-500">
                      {type === "location"
                        ? "Capture GPS coordinates"
                        : "Track contact activity"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
              ⚠️ The recipient must{" "}
              <strong>explicitly allow location access</strong> before any data
              is collected.
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Generating..." : "Generate Tracking Link"}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-white">
              Tracking Link Ready!
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Share this link with the person you want to track.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-500 mb-2">Tracking Link</p>
            <p className="text-sm text-indigo-400 break-all font-mono">
              {result.trackingLink}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-slate-500 text-xs">Phone</p>
              <p className="text-white font-medium">
                {result.tracking.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={copyLink} className="btn-primary flex-1 text-sm">
              📋 Copy Link
            </button>
            <button
              onClick={() => navigate(`/tracking/map/${result.token}`)}
              className="btn-secondary flex-1 text-sm"
            >
              🗺️ Open Live Map
            </button>
            <button
              onClick={() => setResult(null)}
              className="btn-secondary flex-1 text-sm"
            >
              + New Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTracking;
