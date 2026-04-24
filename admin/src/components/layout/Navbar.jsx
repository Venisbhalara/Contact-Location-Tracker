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
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-base text-white">
            <span className="text-xl">📍</span>
            <span className="hidden sm:block">Location<span className="text-indigo-400">Tracker</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <NavLink to="/admin" className={navClass}>
                  <span className="flex items-center gap-1.5 text-sm">
                    Dashboard
                    {pendingCount > 0 && (
                      <span className="bg-red-500 text-white min-w-[18px] text-center text-[9px] px-1 py-0.5 rounded-full font-bold shadow-sm shadow-red-500/30">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                </NavLink>
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-700">
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs bg-indigo-500 text-white shadow-lg"
                    title="View Profile"
                  >
                    {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email === 'vasu@gmail.com' ? 'V' : (user?.email?.charAt(0).toUpperCase() || 'U'))}
                  </div>
                  <button onClick={handleLogout} className="btn-danger text-xs px-3 py-1.5">Logout</button>
                </div>
              </>
            ) : (
              <NavLink to="/login" className={navClass}>Admin Login</NavLink>
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
              <NavLink to="/admin" className={navClass} onClick={() => setMenuOpen(false)}>
                <span className="flex items-center gap-1.5">
                  Dashboard
                  {pendingCount > 0 && (
                    <span className="bg-red-500 text-white min-w-[20px] text-center text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
                <button onClick={handleLogout} className="btn-danger w-full text-sm py-2">Logout</button>
              </div>
            </>
          ) : (
            <NavLink to="/login" className={navClass} onClick={() => setMenuOpen(false)}>Admin Login</NavLink>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
