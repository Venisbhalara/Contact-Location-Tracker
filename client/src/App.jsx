import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'

// ── Lazy-loaded pages (each becomes its own JS chunk) ────────────────────────
const Home           = lazy(() => import('./pages/Home'))
const Login          = lazy(() => import('./pages/Login'))
const Register       = lazy(() => import('./pages/Register'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))

const CreateTracking = lazy(() => import('./pages/CreateTracking'))
const TrackingLink   = lazy(() => import('./pages/TrackingLink'))
const LiveMap        = lazy(() => import('./pages/LiveMap'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'))
const AdminAccess    = lazy(() => import('./pages/admin/AdminAccess'))
const AdminTracking  = lazy(() => import('./pages/admin/AdminTracking'))
const AdminLiveMap   = lazy(() => import('./pages/admin/AdminLiveMap'))
const AdminSecurity  = lazy(() => import('./pages/admin/AdminSecurity'))
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'))
const Terms          = lazy(() => import('./pages/Terms'))
const About          = lazy(() => import('./pages/About'))
const Contact        = lazy(() => import('./pages/Contact'))

// ── Components (always needed, kept eager) ────────────────────────────────────
import Navbar         from './components/Navbar'
import Footer         from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import ScrollToTop from './components/ScrollToTop'

// ── Lightweight inline fallback ───────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── Main layout with navbar and footer ────────────────────────────────────────
const MainLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      {children}
    </main>
    <Footer />
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
    <MainLayout>
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
