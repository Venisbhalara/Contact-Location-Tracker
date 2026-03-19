import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'

// ── Lazy-loaded pages (each becomes its own JS chunk) ────────────────────────
// This drastically reduces the initial bundle size. Each page's code is only
// downloaded the first time the user navigates to it.
const Home           = lazy(() => import('./pages/Home'))
const Login          = lazy(() => import('./pages/Login'))
const Register       = lazy(() => import('./pages/Register'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Contacts       = lazy(() => import('./pages/Contacts'))
const CreateTracking = lazy(() => import('./pages/CreateTracking'))
const TrackingLink   = lazy(() => import('./pages/TrackingLink'))
const LiveMap        = lazy(() => import('./pages/LiveMap'))
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'))
const Terms          = lazy(() => import('./pages/Terms'))
const About          = lazy(() => import('./pages/About'))
const Contact        = lazy(() => import('./pages/Contact'))

// ── Components (always needed, kept eager) ────────────────────────────────────
import Navbar         from './components/Navbar'
import Footer         from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

// ── Lightweight inline fallback ───────────────────────────────────────────────
// Shown while a lazy page chunk is downloading (usually < 200ms on fast connections)
const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

function App() {
  useLenis()

  // No global loading gate here — public pages render instantly.
  // ProtectedRoute handles the auth wait internally before gating protected routes.

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
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

            {/* Public tracking page — target user opens link */}
            <Route path="/track/:token" element={<TrackingLink />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"           element={<Dashboard />} />
              <Route path="/contacts"            element={<Contacts />} />
              <Route path="/tracking/create"     element={<CreateTracking />} />
              <Route path="/tracking/map/:token" element={<LiveMap />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
