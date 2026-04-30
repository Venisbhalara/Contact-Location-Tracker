import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const features = [
  {
    icon: "🔗",
    title: "Secure Tracking Links",
    desc: "Generate encrypted, UUID-secured tracking links that auto-expire — no account needed for recipients.",
    color: "from-indigo-500/20 to-indigo-500/5",
    border: "hover:border-indigo-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]",
    iconBg: "bg-indigo-500/15 border-indigo-500/30",
  },
  {
    icon: <img src="/location.png" alt="Live Tracking" className="w-8 h-8 object-contain" />,
    title: "Live GPS Tracking",
    desc: "Real-time location updates via WebSocket with near-zero latency and sub-meter precision.",
    color: "from-cyan-500/20 to-cyan-500/5",
    border: "hover:border-cyan-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(34,211,238,0.12)]",
    iconBg: "bg-cyan-500/15 border-cyan-500/30",
  },
  {
    icon: "🗺️",
    title: "Interactive Map",
    desc: "View live position on a full Leaflet map with movement path history and accuracy overlay.",
    color: "from-purple-500/20 to-purple-500/5",
    border: "hover:border-purple-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(168,85,247,0.12)]",
    iconBg: "bg-purple-500/15 border-purple-500/30",
  },
  {
    icon: "🔒",
    title: "Privacy First",
    desc: "Location sharing requires explicit consent — always. You are always in full control.",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "hover:border-emerald-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]",
    iconBg: "bg-emerald-500/15 border-emerald-500/30",
  },
  {
    icon: "⚡",
    title: "Real-Time Updates",
    desc: "Socket.IO powered live sync — no page refresh needed. Updates flow instantly as they happen.",
    color: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.12)]",
    iconBg: "bg-amber-500/15 border-amber-500/30",
  },
  {
    icon: "📱",
    title: "No App Needed",
    desc: "Recipients simply open a link in any browser — no download, no signup, no friction.",
    color: "from-pink-500/20 to-pink-500/5",
    border: "hover:border-pink-500/40",
    glow: "hover:shadow-[0_0_40px_rgba(236,72,153,0.12)]",
    iconBg: "bg-pink-500/15 border-pink-500/30",
  },
];

const steps = [
  {
    num: "01",
    icon: "🔗",
    title: "Generate a Tracking Link",
    desc: "Log in and create a unique, encrypted tracking link in one click. UUID-secured and set to auto-expire for maximum privacy.",
    accentFrom: "from-indigo-500",
    accentTo: "to-purple-500",
    iconBg: "bg-indigo-500/15 border-indigo-500/30",
    hoverBorder: "hover:border-indigo-500/50",
    hoverShadow: "hover:shadow-[0_0_50px_rgba(99,102,241,0.15)]",
    hoverBg: "group-hover:opacity-100",
    overlayColor: "from-indigo-600/8",
  },
  {
    num: "02",
    icon: "📨",
    title: "Share with Your Contact",
    desc: "Send the link via WhatsApp, SMS, or email. When they open it and tap 'Allow Location,' sharing begins — instantly and securely.",
    accentFrom: "from-purple-500",
    accentTo: "to-cyan-500",
    iconBg: "bg-purple-500/15 border-purple-500/30",
    hoverBorder: "hover:border-purple-500/50",
    hoverShadow: "hover:shadow-[0_0_50px_rgba(168,85,247,0.15)]",
    overlayColor: "from-purple-600/8",
  },
  {
    num: "03",
    icon: "🗺️",
    title: "Watch Live on the Map",
    desc: "Their location appears on your interactive map in real time via WebSocket. Track movement paths and stay connected.",
    accentFrom: "from-cyan-500",
    accentTo: "to-indigo-500",
    iconBg: "bg-cyan-500/15 border-cyan-500/30",
    hoverBorder: "hover:border-cyan-500/50",
    hoverShadow: "hover:shadow-[0_0_50px_rgba(34,211,238,0.15)]",
    overlayColor: "from-cyan-600/8",
  },
];

const stats = [
  { value: "< 1s", label: "Update Latency" },
  { value: "100%", label: "Consent-Based" },
  { value: "0", label: "App Downloads" },
  { value: "256-bit", label: "Encryption" },
];

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0d0d17" }}>

      {/* ── Background atmosphere orbs ─────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-60 w-[700px] h-[700px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)" }} />
      </div>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-sm rounded-full px-5 py-2 text-sm text-slate-300 mb-8 shadow-lg">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
          </span>
          <span className="font-medium tracking-wide">Real-time location tracking</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6 max-w-4xl">
          Track Location
          <br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff 0%, #c180ff 50%, #7de9ff 100%)" }}>
            In Real Time
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Generate a secure tracking link, share it with anyone — when they allow
          location access, see their live position instantly on your map.
          <span className="text-slate-300 font-medium"> No app download required.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard" className="nextrack-btn-primary text-base px-10 py-4">
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" className="nextrack-btn-primary text-base px-10 py-4">
                Get Started Free
              </Link>
              <Link to="/login" className="nextrack-btn-ghost text-base px-10 py-4">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Stats strip */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06] max-w-3xl w-full mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-6 px-4" style={{ background: "rgba(255,255,255,0.02)" }}>
              <span className="text-2xl font-bold text-white tracking-tight"
                style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff, #c180ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </span>
              <span className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Section label */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Everything you need,{" "}
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff, #c180ff)" }}>
              nothing you don't
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl text-lg">
            Advanced tools for real-time location sharing — built with privacy at the core.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className={`group relative rounded-2xl p-6 border border-white/[0.07] backdrop-blur-sm transition-all duration-500 cursor-default ${f.border} ${f.glow} hover:-translate-y-1`}
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative z-10">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl border text-2xl mb-5 ${f.iconBg} shadow-inner transition-transform duration-300 group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>

              {/* Bottom accent bar */}
              <div className={`absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="relative py-16 px-4 overflow-hidden">
        {/* Section orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)" }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section label */}
          <div className="flex flex-col items-center text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2 text-xs font-bold text-indigo-400 uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              How It Works
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4 leading-tight">
              Track Anyone in{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff 0%, #c180ff 50%, #7de9ff 100%)" }}>
                3 Simple Steps
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl text-lg">
              No app installation needed. No complicated setup. Just seamless, real-time location sharing.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4 relative">
            {/* Desktop connector line */}
            <div className="hidden lg:block absolute top-16 left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] h-px z-0"
              style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.5), rgba(168,85,247,0.5), rgba(34,211,238,0.5))" }} />

            {steps.map((s, i) => (
              <div key={s.num} className={`relative group z-10 ${i === 1 ? "lg:mt-10" : ""}`}>
                <div className={`relative rounded-3xl p-8 h-full border border-white/[0.07] backdrop-blur-sm transition-all duration-500 ${s.hoverBorder} ${s.hoverShadow} hover:-translate-y-1.5`}
                  style={{ background: "rgba(255,255,255,0.025)" }}>
                  {/* Hover overlay */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.overlayColor} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                  <div className="relative z-10">
                    {/* Icon + number row */}
                    <div className="flex items-center justify-between mb-7">
                      <div className={`w-14 h-14 flex items-center justify-center rounded-2xl border text-2xl ${s.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                        {s.icon}
                      </div>
                      <span className="text-6xl font-black select-none" style={{ color: "rgba(255,255,255,0.06)" }}>
                        {s.num}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 transition-colors duration-300">
                      {s.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>

                    {/* Bottom accent line */}
                    <div className={`mt-7 h-0.5 w-10 rounded-full bg-gradient-to-r ${s.accentFrom} ${s.accentTo} group-hover:w-20 transition-all duration-500`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BANNER / CTA ────────────────────────────────────────── */}
      <section className="relative px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Glass card */}
          <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] p-1"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1), rgba(34,211,238,0.08))" }}>
            <div className="rounded-[22px] p-10 text-center relative overflow-hidden"
              style={{ background: "rgba(13,13,23,0.9)", backdropFilter: "blur(40px)" }}>
              {/* Inner orb */}
              <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-40 rounded-full opacity-30"
                style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Zero friction
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                  Ready to gain full{" "}
                  <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: "linear-gradient(135deg, #a3a6ff, #c180ff)" }}>
                    operational visibility?
                  </span>
                </h2>
                <p className="text-slate-400 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
                  Your contacts always choose whether to share their location —
                  <strong className="text-slate-200 font-semibold"> privacy is built in by design.</strong>
                </p>

                {isAuthenticated ? (
                  <Link to="/dashboard" className="nextrack-btn-primary text-base px-12 py-4 inline-flex">
                    Open Dashboard →
                  </Link>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/register" className="nextrack-btn-primary text-base px-12 py-4">
                      Start Tracking Free
                    </Link>
                    <Link to="/login" className="nextrack-btn-ghost text-base px-10 py-4">
                      Sign In
                    </Link>
                  </div>
                )}

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-slate-500">
                  {["🔒 End-to-end encrypted", "✅ Consent-based only", "⚡ Real-time WebSocket", "🌐 No app required"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
