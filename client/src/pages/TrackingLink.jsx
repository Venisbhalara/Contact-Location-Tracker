import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getTrackingByToken } from '../services/api'
import locationService from '../services/locationService'
import geocodingService from '../services/geocodingService'
import toast from 'react-hot-toast'

// Auto-refresh interval in seconds (matches locationService.js)
const REFRESH_INTERVAL_SEC = 10 * 60

const TrackingLink = () => {
  const { token } = useParams()
  const [tracking,    setTracking]   = useState(null)
  const [loading,     setLoading]    = useState(true)
  const [consent,     setConsent]    = useState('idle')  // idle | tracking | denied | stopped | error
  const [position,    setPosition]   = useState(null)
  const [address,     setAddress]    = useState(null)    // { formatted, road, area, city, state }
  const [addrLoading, setAddrLoading] = useState(false)
  const [error,       setError]      = useState(null)
  const [countdown,   setCountdown]  = useState(REFRESH_INTERVAL_SEC) // seconds until next refresh
  const started      = useRef(false)
  const countdownRef = useRef(null)

  // ── Load tracking info ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getTrackingByToken(token)
        setTracking(res.data.tracking)
      } catch {
        setError('Invalid or expired tracking link.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (started.current) locationService.stop()
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // ── Reverse geocode whenever position changes ───────────────
  const fetchAddress = useCallback(async (lat, lon) => {
    setAddrLoading(true)
    try {
      const addr = await geocodingService.reverseGeocode(lat, lon)
      setAddress(addr)
    } catch {
      setAddress(null)
    } finally {
      setAddrLoading(false)
    }
  }, [])

  // ── Start countdown timer ───────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(REFRESH_INTERVAL_SEC)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset countdown when it hits 0 (auto-refresh fires in locationService)
          return REFRESH_INTERVAL_SEC
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Allow button: start tracking ───────────────────────────
  const handleAllow = () => {
    setConsent('tracking')
    started.current = true

    locationService.start({
      token,
      onPosition: (pos) => {
        setPosition(pos)
        setConsent('tracking')
        fetchAddress(pos.latitude, pos.longitude)
        // Reset countdown whenever a fresh location is sent
        startCountdown()
      },
      onError: (msg) => {
        setError(msg)
        setConsent('error')
        toast.error(msg)
      },
      onPermissionDenied: () => {
        setConsent('denied')
      },
      onStopped: () => {
        // The viewer deleted the tracking — stop everything
        setConsent('stopped')
        if (countdownRef.current) clearInterval(countdownRef.current)
        toast('📴 The requester ended this tracking session.', { icon: '🛑' })
      },
    })

    // Start the visual countdown
    startCountdown()
  }

  const handleDeny = () => setConsent('denied')

  // ── Format countdown mm:ss ──────────────────────────────────
  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !tracking) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="card text-center max-w-md w-full">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-white mb-2">Link Invalid or Expired</h1>
        <p className="text-slate-400 text-sm">{error}</p>
      </div>
    </div>
  )

  if (tracking?.status === 'expired') return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="card text-center max-w-md w-full">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-white mb-2">Link Expired</h1>
        <p className="text-slate-400 text-sm">This tracking link has expired and is no longer valid.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Idle — ask for consent ──────────────────────── */}
        {consent === 'idle' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">📍</div>
            <h1 className="text-xl font-bold text-white mb-2">Location Access Request</h1>
            <p className="text-slate-400 text-sm mb-6">
              Someone has requested to see your location. This app will share your GPS coordinates with the requester.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300 mb-6 text-left">
              <p className="font-semibold mb-2">ℹ️ Before you decide:</p>
              <ul className="space-y-1 text-xs">
                <li>• Your location will be shared in real-time</li>
                <li>• Location auto-refreshes every 10 minutes</li>
                <li>• You can stop sharing by closing this tab</li>
                <li>• This link expires on {new Date(tracking?.expiresAt).toLocaleString()}</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleAllow} className="btn-primary w-full py-4 text-base">
                ✅ Allow Location Access
              </button>
              <button onClick={handleDeny} className="btn-secondary w-full py-3">
                ❌ Deny
              </button>
            </div>
          </div>
        )}

        {/* ── Tracking active ─────────────────────────────── */}
        {consent === 'tracking' && (
          <div className="card text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Sharing Location</h1>
            <p className="text-slate-400 text-sm mb-4">Your location is being shared in real-time.</p>

            {/* Address section */}
            <div className="bg-slate-800 rounded-xl p-4 text-left mb-4">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                📍 <span>Current Location</span>
                {addrLoading && <span className="text-indigo-400 text-xs ml-1">Fetching address...</span>}
              </p>

              {address ? (
                <div className="space-y-2">
                  {/* Formatted full address */}
                  <p className="text-sm text-white font-medium leading-snug">{address.formatted}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {address.road && (
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Road</p>
                        <p className="text-xs text-white font-medium truncate">{address.road}</p>
                      </div>
                    )}
                    {address.area && (
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Area</p>
                        <p className="text-xs text-white font-medium truncate">{address.area}</p>
                      </div>
                    )}
                    {address.city && (
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">City</p>
                        <p className="text-xs text-white font-medium truncate">{address.city}</p>
                      </div>
                    )}
                    {address.state && (
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">State</p>
                        <p className="text-xs text-white font-medium truncate">{address.state}</p>
                      </div>
                    )}
                  </div>
                  {position?.accuracy && (
                    <p className="text-xs text-slate-500 mt-2">GPS Accuracy ±{Math.round(position.accuracy)}m</p>
                  )}
                </div>
              ) : (
                position ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Latitude</p>
                      <p className="text-sm font-mono text-white">{position.latitude?.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Longitude</p>
                      <p className="text-sm font-mono text-white">{position.longitude?.toFixed(6)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Acquiring location...</p>
                )
              )}
            </div>

            {/* Auto-refresh countdown */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 mb-4">
              <p className="text-xs text-indigo-300 mb-1">🔄 Next auto-refresh</p>
              <p className="text-2xl font-mono font-bold text-indigo-400">{formatCountdown(countdown)}</p>
              <p className="text-xs text-slate-500 mt-1">Location is refreshed every 10 minutes automatically</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-300">
              Keep this tab open to continue sharing. Close it to stop.
            </div>
          </div>
        )}

        {/* ── Tracking stopped by viewer ──────────────────── */}
        {consent === 'stopped' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">🛑</div>
            <h1 className="text-xl font-bold text-white mb-2">Tracking Ended</h1>
            <p className="text-slate-400 text-sm">
              The requester has ended this tracking session. Your location is no longer being shared.
            </p>
          </div>
        )}

        {/* ── Permission denied ───────────────────────────── */}
        {consent === 'denied' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h1 className="text-xl font-bold text-white mb-2">Location Access Denied</h1>
            <p className="text-slate-400 text-sm">You chose not to share your location. The requester will not receive any location data.</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────── */}
        {consent === 'error' && (
          <div className="card text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Location Error</h1>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <button onClick={handleAllow} className="btn-primary w-full">Try Again</button>
          </div>
        )}

      </div>
    </div>
  )
}

export default TrackingLink
