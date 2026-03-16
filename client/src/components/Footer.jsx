import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <span className="text-2xl">📍</span>
              <span>Contact<span className="text-indigo-400">Tracker</span></span>
            </Link>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              The world's most secure and real-time location sharing platform. built for privacy and performance.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 italic">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-indigo-400 transition-colors">Home</Link></li>
              <li><Link to="/login" className="hover:text-indigo-400 transition-colors">Login</Link></li>
              <li><Link to="/register" className="hover:text-indigo-400 transition-colors">Register</Link></li>
              <li><Link to="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4 italic">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="hover:text-indigo-400 cursor-pointer transition-colors">Features</li>
              <li className="hover:text-indigo-400 cursor-pointer transition-colors">Live Demo</li>
              <li className="hover:text-indigo-400 cursor-pointer transition-colors">Security</li>
              <li className="hover:text-indigo-400 cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} ContactTracker Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-slate-500">
            <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>
            <span className="hover:text-white cursor-pointer transition-colors">GitHub</span>
            <span className="hover:text-white cursor-pointer transition-colors">LinkedIn</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
