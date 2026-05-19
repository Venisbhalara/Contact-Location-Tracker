import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Home", to: "/" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "New Tracking Link", to: "/tracking/create" },
    ],
    Company: [
      { label: "About Us", to: "/about" },
      { label: "Contact Us", to: "/contact" },
    ],
    Legal: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  };

  return (
    <footer
      className="relative hidden sm:block overflow-hidden"
      style={{
        background: "rgba(8,8,16,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Top glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(168,85,247,0.5), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-48 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  boxShadow: "0 0 16px rgba(99,102,241,0.4)",
                }}
              >
                LT
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Nex<span style={{ color: "#a3a6ff" }}>Track</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-5 max-w-xs">
              Real-time, consent-based location sharing for families, friends,
              and teams. No app download required.
            </p>
            <div
              className="inline-flex items-center gap-2 text-xs text-emerald-400 rounded-full px-3 py-1.5"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Location access requires your consent
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4
                className="text-white text-xs font-bold mb-5 uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-slate-500 hover:text-indigo-400 text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                    >
                      <span
                        className="w-0 group-hover:w-2 h-px rounded-full transition-all duration-300"
                        style={{ background: "#a3a6ff" }}
                      />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-14 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-slate-600 text-xs">
            © {year} NexTrack. All rights reserved. Built with privacy in mind.
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: "Privacy Policy", to: "/privacy-policy" },
              { label: "Terms", to: "/terms" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
