import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-slate-800 bg-slate-950 overflow-hidden">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-40 rounded-full bg-indigo-700/5 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/30">
                LT
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Location <span className="text-indigo-400">Tracker</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              Real-time, consent-based location sharing for families, friends, and teams. No app download required.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Location access requires your consent
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">Product</h4>
            <ul className="space-y-3">
              {[
                { label: "Home", to: "/" },
                { label: "Dashboard", to: "/dashboard" },
                { label: "Create Tracking Link", to: "/tracking/create" },
                { label: "Contacts", to: "/contacts" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-slate-500 hover:text-indigo-400 text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-indigo-400 rounded-full transition-all duration-300" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">Company</h4>
            <ul className="space-y-3">
              {[
                { label: "About Us", to: "/about" },
                { label: "Contact Us", to: "/contact" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-slate-500 hover:text-indigo-400 text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-indigo-400 rounded-full transition-all duration-300" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", to: "/privacy-policy" },
                { label: "Terms & Conditions", to: "/terms" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-slate-500 hover:text-indigo-400 text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-0 group-hover:w-2 h-px bg-indigo-400 rounded-full transition-all duration-300" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                🔒 We only access your location{" "}
                <span className="text-indigo-400 font-medium">with your explicit permission.</span>{" "}
                You are always in control.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs text-center sm:text-left">
            © {year} Location Tracker. All rights reserved. Built with privacy in mind.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy-policy" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Privacy Policy
            </Link>
            <span className="text-slate-800">·</span>
            <Link to="/terms" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
