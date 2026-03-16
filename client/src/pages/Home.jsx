import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";

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
      icon: "👥",
      title: "Contact Management",
      desc: "Store and manage all your contacts in one place.",
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

      {/* CTA */}
      {!isAuthenticated && (
        <section className="bg-indigo-900/20 border-y border-indigo-500/20 py-16 text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to start tracking?
          </h2>
          <p className="text-slate-400 mb-8">
            Create your free account in seconds.
          </p>
          <Link to="/register" className="btn-primary text-base px-10 py-3.5">
            Create Account
          </Link>
        </section>
      )}
      <Footer />
    </div>
  );
};

export default Home;
