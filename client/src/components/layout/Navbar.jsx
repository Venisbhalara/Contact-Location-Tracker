import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAdminAccessRequests } from '../../services/api'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (user?.email === 'vasu@gmail.com') {
      getAdminAccessRequests()
        .then(res => {
          const count = res.data.filter(r => r.status === 'pending').length;
          setPendingCount(count);
        })
        .catch(err => console.error("Could not fetch badge count", err));
    }
  }, [user]);

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const navClass = ({ isActive }) =>
    isActive
      ? 'text-indigo-400 font-semibold'
      : 'text-slate-300 hover:text-white transition-colors'

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <span className="text-2xl">📍</span>
            <span className="hidden sm:block">Location<span className="text-indigo-400">Tracker</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard"       className={navClass}>Dashboard</NavLink>

                <NavLink to="/tracking/create" className={navClass}>New Tracking</NavLink>
                {user?.email === 'vasu@gmail.com' && (
                  <NavLink to="/admin" className={navClass}>
                    <span className="flex items-center gap-1.5">
                      Admin
                      {pendingCount > 0 && (
                        <span className="bg-red-500 text-white min-w-[20px] text-center text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm shadow-red-500/30">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  </NavLink>
                )}
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-700">
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      `flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all shadow-lg ${
                        isActive
                          ? "bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                      }`
                    }
                    title="View Profile"
                  >
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </NavLink>
                  <button onClick={handleLogout} className="btn-danger text-sm px-4 py-2">Logout</button>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/login"    className={navClass}>Login</NavLink>
                <Link   to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 flex flex-col gap-4">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard"       className={navClass} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>

              <NavLink to="/tracking/create" className={navClass} onClick={() => setMenuOpen(false)}>New Tracking</NavLink>
              {user?.email === 'vasu@gmail.com' && (
                <NavLink to="/admin" className={navClass} onClick={() => setMenuOpen(false)}>
                  <span className="flex items-center gap-1.5">
                    Admin Panel
                    {pendingCount > 0 && (
                      <span className="bg-red-500 text-white min-w-[20px] text-center text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                </NavLink>
              )}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
                <NavLink to="/profile" className={navClass} onClick={() => setMenuOpen(false)}>
                   My Profile
                </NavLink>
                <button onClick={handleLogout} className="btn-danger w-full text-sm py-2">Logout</button>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login"    className={navClass} onClick={() => setMenuOpen(false)}>Login</NavLink>
              <Link   to="/register" className="btn-primary text-sm py-2 text-center" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
