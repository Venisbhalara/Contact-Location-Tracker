import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser, googleLogin } from "../../services/api";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";

/* ── Shared Google SVG ───────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ── Field component ─────────────────────────────────────────────── */
const Field = ({ label, name, type = "text", placeholder, value, onChange, required = true }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
      {label}
    </label>
    <input
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-300 shadow-inner"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
    />
  </div>
);

/* ── Divider ─────────────────────────────────────────────────────── */
const OrDivider = () => (
  <div className="flex items-center gap-4">
    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>OR</span>
    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
  </div>
);

/* ── Google button ───────────────────────────────────────────────── */
const GoogleButton = ({ onClick, loading, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="flex items-center justify-center gap-3 w-full px-4 py-4 rounded-xl font-bold text-sm transition-all duration-300 group disabled:opacity-50"
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#e2e8f0",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
    }}
  >
    <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
      <GoogleIcon />
    </div>
    <span className="tracking-wide">{label}</span>
  </button>
);

/* ══════════════════════════════════════════════════════════════════ */
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    email: localStorage.getItem("rememberedEmail") || "", 
    password: "" 
  });
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("rememberedEmail"));
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser(form);
      
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", form.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.message || "Invalid email or password. Please try again.");
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
        toast.success(`Welcome back, ${res.data.user.name}!`);
        navigate("/dashboard");
      } catch (err) {
        console.error("Google login error:", err);
        toast.error(err.response?.data?.message || "Google login failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Sign-In failed."),
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#0d0d17" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.1) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-6 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: "0 0 50px rgba(99,102,241,0.4)",
            }}
          >
            <img src="/location.png" alt="NexTrack Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-slate-500 font-medium tracking-wide">
            Sign in to your NexTrack account
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[2.5rem] p-10"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(40px)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Password
                </label>
                <Link to="/forgot-password" title="Coming soon" className="text-[10px] font-bold uppercase tracking-[0.05em] text-indigo-400/80 hover:text-indigo-400 transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition-all duration-300 shadow-inner"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    letterSpacing: form.password && !showPw ? "0.4em" : "normal",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.254 0 2.415.283 3.456.784m1.56 1.56a9.456 9.456 0 013.458 4.656C20.268 15.057 16.477 18 12 18c-.453 0-.895-.034-1.328-.101M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-400 select-none cursor-pointer hover:text-slate-300 transition-colors">
                Remember my email
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-sm text-white transition-all duration-500 mt-2 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.5)",
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          <div className="my-10">
            <OrDivider />
          </div>

          <GoogleButton
            onClick={() => customGoogleLogin()}
            loading={loading}
            label="Continue with Google"
          />

          <p className="text-center text-sm mt-10 text-slate-500 font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] mt-10 text-slate-600 uppercase tracking-widest font-bold">
          🛡️ Secure & Encrypted Infrastructure
        </p>
      </div>
    </div>
  );
};

export default Login;
