import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerUser, googleLogin } from "../../services/api";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";

/* ── Google Icon ─────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ── Field component ─────────────────────────────────────────────── */
const Field = ({ label, name, type = "text", placeholder, value, onChange, hint }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label}
      </label>
      {hint && <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{hint}</span>}
    </div>
    <input
      name={name}
      type={type}
      required
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onFocus={e => {
        e.target.style.border = "1px solid rgba(99,102,241,0.6)";
        e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12), 0 0 20px rgba(99,102,241,0.08)";
      }}
      onBlur={e => {
        e.target.style.border = "1px solid rgba(255,255,255,0.08)";
        e.target.style.boxShadow = "none";
      }}
    />
  </div>
);

/* ══════════════════════════════════════════════════════════════════ */
const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res = await registerUser(form);
      login(res.data.user, res.data.token);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const customGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await googleLogin({ access_token: tokenResponse.access_token });
        login(res.data.user, res.data.token);
        toast.success("Signed in with Google successfully!");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Google registration failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Sign-In failed."),
  });

  /* Password strength */
  const pwStrength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Too short", color: "#ef4444", width: "20%" };
    if (p.length < 8) return { label: "Weak", color: "#f59e0b", width: "40%" };
    if (p.length < 10 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: "Fair", color: "#eab308", width: "65%" };
    return { label: "Strong", color: "#10b981", width: "100%" };
  })();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#0d0d17" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-8"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            }}
          >
            <img src="/location.png" alt="NexTrack Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Create your account</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Start tracking in seconds — it's free
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Full name"
              name="name"
              placeholder="Alex Johnson"
              value={form.name}
              onChange={handleChange}
            />
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />

            {/* Password with strength indicator */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-xs transition-colors duration-200"
                  style={{ color: "rgba(163,166,255,0.7)" }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <input
                name="password"
                type={showPw ? "text" : "password"}
                required
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  letterSpacing: form.password && !showPw ? "0.2em" : "normal",
                }}
                onFocus={e => {
                  e.target.style.border = "1px solid rgba(99,102,241,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
                }}
                onBlur={e => {
                  e.target.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {/* Strength bar */}
              {pwStrength && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: pwStrength.width, background: pwStrength.color }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: loading ? "none" : "0 0 24px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 36px rgba(99,102,241,0.6)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 24px rgba(99,102,241,0.4)"; }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                "Create Account →"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>or sign up with Google</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => customGoogleLogin()}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 group disabled:opacity-50 mb-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.18)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
            }}
          >
            <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <GoogleIcon />
            </div>
            <span className="tracking-wide">Sign up with Google</span>
          </button>

          {/* Terms note */}
          <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-slate-300 transition-colors">Terms</Link>
            {" & "}
            <Link to="/privacy-policy" className="underline hover:text-slate-300 transition-colors">Privacy Policy</Link>
          </p>

          {/* Footer link */}
          <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold transition-colors duration-200"
              style={{ color: "#a3a6ff" }}
              onMouseEnter={e => e.currentTarget.style.color = "#c180ff"}
              onMouseLeave={e => e.currentTarget.style.color = "#a3a6ff"}
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Trust note */}
        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          🔒 Your data is encrypted and never shared
        </p>
      </div>
    </div>
  );
};

export default Register;
