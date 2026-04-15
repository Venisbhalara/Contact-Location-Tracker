import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
} from "../../services/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("general");
  // Per-form independent loading & saved states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved]     = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved]     = useState(false);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    defaultTrackingExpiration: "24h",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [deleteData, setDeleteData] = useState({ password: "" });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getUserProfile();
      setProfileData({
        name: res.data.name || "",
        email: res.data.email || "",
        phoneNumber: res.data.phoneNumber || "",
        defaultTrackingExpiration: res.data.defaultTrackingExpiration || "24h",
      });
    } catch {
      toast.error("Failed to load profile data");
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSaved(false);
    try {
      const res = await updateUserProfile(profileData);
      // Instantly propagate updated fields across the entire app (Navbar, etc.)
      updateUser(res.data);
      setProfileSaved(true);
      toast.success("Profile saved!");
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setPasswordLoading(true);
    setPasswordSaved(false);
    try {
      await updateUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSaved(true);
      toast.success("Password updated!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deleteData.password) return toast.error("Please enter your password");
    if (
      !window.confirm(
        "Are you SURE you want to delete your account? This action cannot be undone.",
      )
    )
      return;

    setDeleteLoading(true);
    try {
      await deleteUserAccount({ password: deleteData.password });
      toast.success("Account deleted");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Determine Initials for Avatar
  const initial = profileData.name
    ? profileData.name.charAt(0).toUpperCase()
    : user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 text-white pt-24 font-['Inter']">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          Profile Settings
        </h1>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-slate-800/30 p-6 flex md:flex-col gap-2 overflow-x-auto border-b md:border-b-0 md:border-r border-slate-700/50">
            <TabButton
              active={activeTab === "general"}
              onClick={() => setActiveTab("general")}
              label="General Info"
            />
            <TabButton
              active={activeTab === "security"}
              onClick={() => setActiveTab("security")}
              label="Security"
            />
            <TabButton
              active={activeTab === "preferences"}
              onClick={() => setActiveTab("preferences")}
              label="Tracking Prefs"
            />
            <TabButton
              active={activeTab === "danger"}
              onClick={() => setActiveTab("danger")}
              label="Danger Zone"
              danger
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 md:p-8">
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-white/10">
                  Personal Details
                </h2>

                {/* Initial Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    {/* Ring for decoration */}
                    <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur opacity-30"></div>
                    <div className="relative w-24 h-24 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-indigo-500/20">
                      {initial}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">
                      {profileData.name || "User"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Update your basic information below.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-300 cursor-not-allowed"
                      disabled
                      title="Email cannot be changed directly"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={profileData.phoneNumber}
                      onChange={handleProfileChange}
                      placeholder="Add phone number"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="pt-4">
                    <SaveButton loading={profileLoading} saved={profileSaved} label="Save Changes" />
                  </div>
                </form>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-white/10">
                  Security Settings
                </h2>

                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-5 bg-slate-900/30 p-6 rounded-xl border border-slate-700/50 mb-8"
                >
                  <h3 className="font-medium text-indigo-400 mb-4">
                    Change Password
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="pt-2">
                    <SaveButton loading={passwordLoading} saved={passwordSaved} label="Update Password" variant="secondary" />
                  </div>
                </form>

                <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-700/50">
                  <h3 className="font-medium text-indigo-400 mb-2">
                    Active Sessions
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    You are currently logged into the following devices.
                  </p>
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div>
                      <p className="font-medium">Current Session (Browser)</p>
                      <p className="text-xs text-green-400">Active now</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeTab === "preferences" && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-white/10">
                  App Settings
                </h2>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-700/50">
                    <h3 className="font-medium text-indigo-400 mb-1">
                      Default Tracking Link Expiration
                    </h3>
                    <p className="text-sm text-slate-400 mb-5">
                      Set the standard duration before your sharing links
                      automatically expire.
                    </p>

                    <ExpirationPicker
                      value={profileData.defaultTrackingExpiration}
                      onChange={(val) =>
                        setProfileData({
                          ...profileData,
                          defaultTrackingExpiration: val,
                        })
                      }
                    />
                  </div>

                  <SaveButton loading={profileLoading} saved={profileSaved} label="Save Preferences" />
                </form>
              </div>
            )}

            {/* DANGER ZONE TAB */}
            {activeTab === "danger" && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold mb-6 pb-2 border-b border-red-500/30 text-red-500">
                  Danger Zone
                </h2>

                <div className="bg-red-950/20 p-6 rounded-xl border border-red-900/50">
                  <h3 className="font-medium text-red-400 mb-2">
                    Delete Account
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Once you delete your account, there is no going back. Please
                    be certain. All your tracking data and settings will be
                    permanently erased.
                  </p>

                  <form
                    onSubmit={handleDeleteAccount}
                    className="space-y-4 max-w-sm"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Confirm Identity
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={deleteData.password}
                        onChange={(e) =>
                          setDeleteData({ password: e.target.value })
                        }
                        required
                        className="w-full bg-slate-900/80 border border-red-900/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deleteLoading}
                      className="w-full px-6 py-2.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 border border-red-500/50 flex items-center justify-center gap-2"
                    >
                      {deleteLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                      ) : "Permanently Delete Account"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global styling for fade-in animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
        }}
      />
    </div>
  );
}


// ─── Premium Save Button with spinner + green check ───────────────────────────
const SaveButton = ({ loading, saved, label, variant = "primary" }) => {
  const base = "inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-60 focus:outline-none";
  const styles = {
    primary: `${base} bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30`,
    secondary: `${base} bg-slate-700 hover:bg-slate-600 text-white`,
  };
  return (
    <button type="submit" disabled={loading || saved} className={saved ? `${styles[variant]} !bg-green-600 !shadow-green-500/30` : styles[variant]}>
      {loading ? (
        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{label}</>
      ) : saved ? (
        <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Saved!</>
      ) : label}
    </button>
  );
};

// Subcomponent for Sidebar Tabs
const TabButton = ({ active, onClick, label, danger }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
      active
        ? danger
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
    }`}
  >
    {label}
  </button>
);

// ─── Premium Expiration Picker ──────────────────────────────────────────────
const EXPIRATION_OPTIONS = [
  {
    value: "1h",
    label: "1 Hour",
    sublabel: "Short-lived, for quick checks",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    accent: "from-sky-500/20 to-sky-600/5",
    ring: "ring-sky-500/50",
    iconColor: "text-sky-400",
    dot: "bg-sky-500",
  },
  {
    value: "12h",
    label: "12 Hours",
    sublabel: "Half a day of sharing",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    accent: "from-violet-500/20 to-violet-600/5",
    ring: "ring-violet-500/50",
    iconColor: "text-violet-400",
    dot: "bg-violet-500",
  },
  {
    value: "24h",
    label: "24 Hours",
    sublabel: "Full day — most popular",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    accent: "from-indigo-500/20 to-indigo-600/5",
    ring: "ring-indigo-500/50",
    iconColor: "text-indigo-400",
    dot: "bg-indigo-500",
    badge: "Popular",
  },
  {
    value: "7d",
    label: "7 Days",
    sublabel: "Week-long visibility",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
    accent: "from-emerald-500/20 to-emerald-600/5",
    ring: "ring-emerald-500/50",
    iconColor: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    value: "never",
    label: "Never Expire",
    sublabel: "Link stays active forever",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    accent: "from-amber-500/20 to-amber-600/5",
    ring: "ring-amber-500/50",
    iconColor: "text-amber-400",
    dot: "bg-amber-500",
    badge: "∞",
  },
];

const ExpirationPicker = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {EXPIRATION_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              relative flex items-center gap-4 p-4 rounded-xl border text-left
              transition-all duration-200 group overflow-hidden
              ${
                isActive
                  ? `bg-gradient-to-br ${opt.accent} ${opt.ring} ring-1 border-transparent shadow-lg`
                  : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70"
              }
            `}
          >
            {/* Subtle shimmer bg on hover (active only) */}
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent pointer-events-none" />
            )}

            {/* Icon */}
            <div
              className={`flex-shrink-0 p-2 rounded-lg ${
                isActive
                  ? `bg-white/10 ${opt.iconColor}`
                  : "bg-slate-700/50 text-slate-400 group-hover:text-slate-200"
              } transition-colors duration-200`}
            >
              {opt.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div
                className={`font-semibold text-sm flex items-center gap-2 ${
                  isActive ? "text-white" : "text-slate-300"
                }`}
              >
                {opt.label}
                {opt.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? `${opt.dot} text-white`
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </div>
              <div
                className={`text-xs mt-0.5 truncate ${
                  isActive ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {opt.sublabel}
              </div>
            </div>

            {/* Active check */}
            <div
              className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? `${opt.dot} border-transparent`
                  : "border-slate-600 group-hover:border-slate-500"
              }`}
            >
              {isActive && (
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
