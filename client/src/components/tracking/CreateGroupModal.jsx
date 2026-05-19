import { useState } from "react";
import { createGroup } from "../../services/api";
import toast from "react-hot-toast";

const EXPIRY_OPTIONS = [
  { label: "6 Hours", value: 6 },
  { label: "12 Hours", value: 12 },
  { label: "24 Hours", value: 24 },
  { label: "48 Hours", value: 48 },
  { label: "7 Days", value: 168 },
];

const CreateGroupModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: "", description: "", expiryHours: 24 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Group name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await createGroup({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        expiryHours: form.expiryHours,
      });
      onCreated(res.data.group);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.data?.code === "NO_TRACKING_ACCESS") {
        toast.error("You don't have tracking access yet. Await admin approval.");
      } else {
        toast.error(msg || "Failed to create group.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden"
        style={{ background: "rgba(13,13,23,0.98)" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.07] flex items-center justify-between"
          style={{ background: "rgba(0,0,0,0.3)" }}>
          <div>
            <h2 className="text-white font-bold text-lg">Create Group</h2>
            <p className="text-slate-500 text-xs mt-0.5">Track up to 5 people on one live map</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* Group name */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Group Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder='e.g. "Family", "Team Alpha", "Fleet 1"'
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Description <span className="text-slate-600">(optional)</span></label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this group for?"
              maxLength={255}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Session Duration</label>
            <div className="grid grid-cols-5 gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, expiryHours: opt.value }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    form.expiryHours === opt.value
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/40 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3">
            <p className="text-indigo-400 text-xs font-semibold mb-1">💡 After creating the group:</p>
            <ul className="text-slate-500 text-xs space-y-0.5 list-disc list-inside">
              <li>Add members (phone + label) — costs 1 credit each</li>
              <li>Share individual tracking links with each person</li>
              <li>Watch everyone live on the Group Map</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-sm font-medium transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              {loading ? "Creating..." : "Create Group →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
