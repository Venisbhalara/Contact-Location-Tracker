import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'

// ── Lazy-loaded pages (each becomes its own JS chunk) ────────────────────────
const Home           = lazy(() => import('./pages/public/Home'))
const Login          = lazy(() => import('./pages/auth/Login'))
const Register       = lazy(() => import('./pages/auth/Register'))
const Dashboard      = lazy(() => import('./pages/user/Dashboard'))

const CreateTracking = lazy(() => import('./pages/tracking/CreateTracking'))
const TrackingLink   = lazy(() => import('./pages/tracking/TrackingLink'))
const LiveMap        = lazy(() => import('./pages/tracking/LiveMap'))
const Profile        = lazy(() => import('./pages/user/Profile'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'))
const AdminAccess    = lazy(() => import('./pages/admin/AdminAccess'))
const AdminTracking  = lazy(() => import('./pages/admin/AdminTracking'))
const AdminLiveMap   = lazy(() => import('./pages/admin/AdminLiveMap'))
const AdminSecurity  = lazy(() => import('./pages/admin/AdminSecurity'))
const PrivacyPolicy  = lazy(() => import('./pages/legal/PrivacyPolicy'))
const Terms          = lazy(() => import('./pages/legal/Terms'))
const About          = lazy(() => import('./pages/public/About'))
const Contact        = lazy(() => import('./pages/public/Contact'))

// ── Components (always needed, kept eager) ────────────────────────────────────
import Navbar         from './components/layout/Navbar'
import Footer         from './components/layout/Footer'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import ScrollToTop from './components/layout/ScrollToTop'

// ── Lightweight inline fallback ───────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── Main layout with navbar and footer ────────────────────────────────────────
const MainLayout = ({ children, hideFooter }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      {children}
    </main>
    {!hideFooter && <Footer />}
  </div>
)

// ── Minimal layout for tracking links (no navbar/footer) ───────────────────────
const MinimalLayout = ({ children }) => (
  <div className="min-h-screen bg-slate-900">
    {children}
  </div>
)

function App() {
  useLenis()
  const location = useLocation()
  const isTrackingRoute = location.pathname.startsWith('/track/')
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'

  // If it's a tracking route, use minimal layout
  if (isTrackingRoute) {
    return (
      <MinimalLayout>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/track/:token" element={<TrackingLink />} />
          </Routes>
        </Suspense>
      </MinimalLayout>
    )
  }

  // Otherwise, use the main layout with navbar and footer
  return (
    <MainLayout hideFooter={isAuthRoute}>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Legal & Info */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms"          element={<Terms />} />
          <Route path="/about"          element={<About />} />
          <Route path="/contact"        element={<Contact />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"           element={<Dashboard />} />
            <Route path="/profile"             element={<Profile />} />
            <Route path="/tracking/create"     element={<CreateTracking />} />
            <Route path="/tracking/map/:token" element={<LiveMap />} />
          </Route>

          {/* Admin Protected */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/access" element={<AdminAccess />} />
            <Route path="/admin/tracking" element={<AdminTracking />} />
            <Route path="/admin/live-map" element={<AdminLiveMap />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  )
}

export default App
