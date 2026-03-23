import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: "🔗",
      title: "Secure Tracking Links",
      desc: "Generate unique UUID-based links that expire automatically.",
    },
    {
      icon: "📍",
      title: "Live GPS Tracking",
      desc: "Real-time location updates via WebSocket with zero delay.",
    },
    {
      icon: "🗺️",
      title: "Interactive Map",
      desc: "View live location on a full Leaflet map with movement path.",
    },

    {
      icon: "🔒",
      title: "Privacy First",
      desc: "Location sharing requires explicit consent — always.",
    },
    {
      icon: "⚡",
      title: "Real-Time Updates",
      desc: "Socket.IO powered live updates without page refresh.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Trust Banner */}
      <div className="relative overflow-hidden border-b border-slate-800/80">
        {/* Gradient line on top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0 text-center sm:text-left">
          {/* Left message */}
          <div className="flex items-center gap-2.5">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base">
              🔒
            </span>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-emerald-400">
                Track location safely
              </span>{" "}
              <span className="text-slate-400">with full user permission.</span>
            </p>
          </div>

          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px h-5 bg-slate-700 mx-6 flex-shrink-0" />

          {/* Right message */}
          <div className="flex items-center gap-2.5">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-base">
              🛡️
            </span>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-indigo-400">
                We respect your privacy
              </span>{" "}
              <span className="text-slate-400">
                and never misuse your data.
              </span>
            </p>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Real-time location tracking
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Track Location
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              In Real Time
            </span>
          </h1>
          <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
            Generate a secure tracking link, share it with anyone — when they
            allow location access, see their live position instantly on a map.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="btn-primary text-base px-8 py-3.5"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary text-base px-8 py-3.5"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/login"
                  className="btn-secondary text-base px-8 py-3.5"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="card hover:border-indigo-500/50 transition-all duration-300 group"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-28 px-4 overflow-hidden">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-700/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 w-72 h-72 rounded-full bg-purple-700/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 w-72 h-72 rounded-full bg-cyan-700/10 blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Section badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-5 py-1.5 text-sm font-medium text-indigo-400 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              How It Works
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl font-bold text-center text-white mb-4 leading-tight">
            Track Anyone in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-center text-slate-400 max-w-xl mx-auto mb-20 text-lg">
            No app installation needed. No complicated setup. Just pure,
            seamless real-time location sharing.
          </p>

          {/* Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden lg:block absolute top-16 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-indigo-500/60 via-purple-500/60 to-cyan-500/60 z-0" />

            {/* Step 1 */}
            <div className="relative group z-10 px-3">
              <div className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-3xl p-8 h-full transition-all duration-500 hover:border-indigo-500/60 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                {/* Step number */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-2xl shadow-inner shadow-indigo-500/10">
                    🔗
                  </div>
                  <span className="text-5xl font-black text-slate-800 select-none">
                    01
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors duration-300">
                  Generate a Tracking Link
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Log in to your dashboard and create a unique, encrypted
                  tracking link in one click. Each link is UUID-secured and set
                  to auto-expire for maximum privacy.
                </p>
                {/* Bottom accent */}
                <div className="mt-6 h-0.5 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-24 transition-all duration-500" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group z-10 px-3 lg:mt-12">
              <div className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-3xl p-8 h-full transition-all duration-500 hover:border-purple-500/60 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:-translate-y-1">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-2xl shadow-inner shadow-purple-500/10">
                    📨
                  </div>
                  <span className="text-5xl font-black text-slate-800 select-none">
                    02
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300">
                  Share with Your Contact
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Send the link to a friend or family member via WhatsApp, SMS,
                  or email. When they open it and tap "Allow Location," sharing
                  begins — instantly and securely.
                </p>
                <div className="mt-6 h-0.5 w-12 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 group-hover:w-24 transition-all duration-500" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group z-10 px-3">
              <div className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-3xl p-8 h-full transition-all duration-500 hover:border-cyan-500/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] hover:-translate-y-1">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-2xl shadow-inner shadow-cyan-500/10">
                    🗺️
                  </div>
                  <span className="text-5xl font-black text-slate-800 select-none">
                    03
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors duration-300">
                  Watch Live on the Map
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Their location appears on your interactive map in real time
                  via WebSocket. Track movement paths, see live updates, and
                  stay connected — all without any app downloads.
                </p>
                <div className="mt-6 h-0.5 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 group-hover:w-24 transition-all duration-500" />
              </div>
            </div>
          </div>

          {/* Bottom CTA within section */}
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="relative inline-block mb-8">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 blur-md opacity-50" />
              <div className="relative bg-slate-900 border border-slate-700 rounded-2xl px-8 py-5 text-slate-300 text-sm leading-relaxed max-w-lg">
                <span className="text-white font-semibold">
                  Zero friction. Total transparency.
                </span>{" "}
                Your contacts always choose whether to share their location —
                privacy is built in by design.
              </div>
            </div>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="btn-primary text-base px-10 py-3.5"
              >
                Open Dashboard →
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="btn-primary text-base px-10 py-3.5"
                >
                  Start Tracking Free
                </Link>
                <Link
                  to="/login"
                  className="btn-secondary text-base px-8 py-3.5"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
