import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
    }`

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(13,13,23,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/location.png" alt="NexTrack Logo" className="w-9 h-9 object-contain drop-shadow-xl" />
            <span className="hidden sm:block font-bold text-lg text-white tracking-tight">
              Nex<span style={{ color: '#a3a6ff' }}>Track</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard"       className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/tracking/create" className={navLinkClass}>New Tracking</NavLink>

                <div className="flex items-center gap-3 ml-4 pl-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Avatar */}
                  <NavLink
                    to="/profile"
                    title="View Profile"
                    className={({ isActive }) =>
                      `flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all shadow-lg ${
                        isActive
                          ? 'text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-transparent'
                          : 'text-slate-300 hover:text-white'
                      }`
                    }
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/"       className={navLinkClass} end>Home</NavLink>
                <NavLink to="/about"   className={navLinkClass}>About</NavLink>
                <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>

                <div className="flex items-center gap-3 ml-2">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-300 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      boxShadow: '0 0 16px rgba(99,102,241,0.35)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(99,102,241,0.55)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 16px rgba(99,102,241,0.35)'}
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors text-slate-400 hover:text-white"
            style={{ background: menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden px-4 py-5 flex flex-col gap-4"
          style={{
            background: 'rgba(13,13,23,0.97)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard"       className={navLinkClass} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/tracking/create" className={navLinkClass} onClick={() => setMenuOpen(false)}>New Tracking</NavLink>
              <div className="pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <NavLink to="/profile" className={navLinkClass} onClick={() => setMenuOpen(false)}>My Profile</NavLink>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/"       className={navLinkClass} end onClick={() => setMenuOpen(false)}>Home</NavLink>
              <NavLink to="/about"   className={navLinkClass} onClick={() => setMenuOpen(false)}>About</NavLink>
              <NavLink to="/contact" className={navLinkClass} onClick={() => setMenuOpen(false)}>Contact</NavLink>
              <div className="pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <Link to="/login"    className="text-sm font-medium text-slate-400 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold px-5 py-2.5 rounded-lg text-center text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
                >
                  Get Started Free
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
