import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useLenis } from './hooks/useLenis'

// ── Lazy-loaded pages (each becomes its own JS chunk) ────────────────────────
const Login          = lazy(() => import('./pages/auth/Login'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'))
const AdminAccess    = lazy(() => import('./pages/admin/AdminAccess'))
const AdminTracking  = lazy(() => import('./pages/admin/AdminTracking'))
const AdminLiveMap   = lazy(() => import('./pages/admin/AdminLiveMap'))
const AdminSecurity  = lazy(() => import('./pages/admin/AdminSecurity'))
const AdminActivity  = lazy(() => import('./pages/admin/AdminActivity'))

// ── Components (always needed, kept eager) ────────────────────────────────────
import Navbar         from './components/layout/Navbar'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import ScrollToTop from './components/layout/ScrollToTop'

// ── Lightweight inline fallback ───────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// ── Main layout with navbar ───────────────────────────────────────────────────
const MainLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      {children}
    </main>
  </div>
)

// ── Minimal layout for tracking links (no navbar) ──────────────────────────────
const MinimalLayout = ({ children }) => (
  <div className="min-h-screen bg-slate-900">
    {children}
  </div>
)

function App() {
  useLenis()

  // Otherwise, use the main layout with navbar
  return (
    <MainLayout>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public / Catch-all */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Protected */}
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/access" element={<AdminAccess />} />
            <Route path="/admin/tracking" element={<AdminTracking />} />
            <Route path="/admin/live-map" element={<AdminLiveMap />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/activity" element={<AdminActivity />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  )
}

export default App
