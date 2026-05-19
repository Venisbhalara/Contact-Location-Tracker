import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerUser, googleLogin, sendOtp } from "../../services/api";
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
      <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </label>
      {hint && <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.2)" }}>{hint}</span>}
    </div>
    <input
      name={name}
      type={type}
      required
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

/* ── OtpInput component ────────────────────────────────────────────── */
const OtpInput = ({ length = 6, value, onChange }) => {
  const inputs = useRef([]);
  
  const focusNext = (index) => {
    if (index < length - 1 && inputs.current[index + 1]) {
      inputs.current[index + 1].focus();
    }
  };
  
  const focusPrev = (index) => {
    if (index > 0 && inputs.current[index - 1]) {
      inputs.current[index - 1].focus();
    }
  };

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    const newOtp = value.split('');
    while(newOtp.length < length) newOtp.push('');
    
    newOtp[index] = val.slice(-1);
    onChange(newOtp.join(''));
    if (val) focusNext(index);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newOtp = value.split('');
      while(newOtp.length < length) newOtp.push('');
      
      if (newOtp[index]) {
        newOtp[index] = '';
        onChange(newOtp.join(''));
      } else {
        focusPrev(index);
      }
    } else if (e.key === 'ArrowLeft') {
      focusPrev(index);
    } else if (e.key === 'ArrowRight') {
      focusNext(index);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, length - 1);
      if (inputs.current[focusIndex]) inputs.current[focusIndex].focus();
    }
  };

  return (
    <div className="flex gap-2 justify-between w-full" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl text-white outline-none transition-all duration-300 shadow-inner"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    try {
      await sendOtp(form);
      toast.success("OTP sent to your email!");
      setShowOtpModal(true);
    } catch (err) {
      console.error("Send OTP error:", err);
      toast.error(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("Please enter the OTP.");
    setLoading(true);
    try {
      const res = await registerUser({ ...form, otp });
      login(res.data.user, res.data.token);
      toast.success("Account created successfully!");
      setShowOtpModal(false);
      navigate("/dashboard");
    } catch (err) {
      console.error("Register error:", err);
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
        console.error("Google Auth error:", err);
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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-6 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: "0 0 50px rgba(99,102,241,0.4)",
            }}
          >
            <img src="/location.png" alt="NexTrack Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Join NexTrack</h1>
          <p className="text-slate-500 font-medium tracking-wide">
            Start tracking in seconds — it's free
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
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-[10px] font-bold uppercase tracking-[0.05em] text-indigo-400/80 hover:text-indigo-400 transition-colors"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative group">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Min. 6 characters"
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
              </div>
              {/* Strength bar */}
              {pwStrength && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: pwStrength.width, background: pwStrength.color }}
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>

            {/* Submit */}
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
                  Create Account
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </form>

          <div className="my-8">
            <OrDivider />
          </div>

          <GoogleButton
            onClick={() => customGoogleLogin()}
            loading={loading}
            label="Sign up with Google"
          />

          {/* Terms note */}
          <p className="text-center text-[10px] mt-6 text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
            By joining, you agree to our{" "}
            <Link to="/terms" className="text-slate-400 hover:text-indigo-400 transition-colors">Terms</Link>
            {" & "}
            <Link to="/privacy-policy" className="text-slate-400 hover:text-indigo-400 transition-colors">Privacy</Link>
          </p>

          <p className="text-center text-sm mt-8 text-slate-500 font-medium">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] mt-10 text-slate-600 uppercase tracking-widest font-bold">
          🛡️ Trusted by users worldwide
        </p>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOtpModal(false)} />
          <div 
            className="relative w-full max-w-sm p-8 rounded-3xl"
            style={{
              background: "rgba(13, 13, 23, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Verify Email</h3>
              <p className="text-sm text-slate-400">
                We sent a code to <span className="text-white font-medium">{form.email}</span>
              </p>
            </div>
            
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
              <OtpInput value={otp} onChange={setOtp} />
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-sm text-white transition-all duration-500 mt-2 disabled:opacity-50 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.5)",
                }}
              >
                {loading ? "Verifying..." : "Verify & Register"}
              </button>
              
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
