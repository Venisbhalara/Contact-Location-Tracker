import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserTrackings, deleteTracking } from '../services/api'
import toast from 'react-hot-toast'

const statusBadge = (status) => {
  const map = { active: 'badge-green', pending: 'badge-yellow', expired: 'badge-red' }
  return <span className={map[status] || 'badge-blue'}>{status}</span>
}

const Dashboard = () => {
  const { user } = useAuth()
  const [trackings,  setTrackings]  = useState([])

  const [loading,    setLoading]    = useState(true)

  const load = async () => {
    try {
      const [tRes] = await Promise.all([
        getUserTrackings({ limit: 5 }),
      ])
      setTrackings(tRes.data.trackings)
    } catch {
      toast.error('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this tracking request?')) return
    try {
      await deleteTracking(id)
      toast.success('Tracking deleted.')
      load()
    } catch { toast.error('Failed to delete.') }
  }

  const stats = [

    { label: 'Active Trackings', value: trackings.filter(t => t.status === 'active').length, icon: '📡', color: 'text-emerald-400' },
    { label: 'Pending Links',   value: trackings.filter(t => t.status === 'pending').length, icon: '⏳', color: 'text-yellow-400' },
    { label: 'Expired Links',   value: trackings.filter(t => t.status === 'expired').length, icon: '🔴', color: 'text-red-400' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome back, <span className="text-indigo-400">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your tracking requests.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col gap-2">
            <span className="text-2xl">{s.icon}</span>
            <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link to="/tracking/create" className="btn-primary text-sm">+ New Tracking Link</Link>

      </div>

      {/* Recent Tracking Requests */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent Tracking Requests</h2>
          <Link to="/tracking/create" className="text-xs text-indigo-400 hover:underline">View all</Link>
        </div>
        {trackings.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">No tracking requests yet.</p>
            <Link to="/tracking/create" className="text-indigo-400 text-sm hover:underline mt-1 block">Create one</Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="pb-3 pr-4 font-medium">Phone</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium hidden sm:table-cell">Expires</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {trackings.map((t) => (
                  <tr key={t.id} className="text-slate-300">
                    <td className="py-3 pr-4 font-mono text-xs">{t.phoneNumber}</td>
                    <td className="py-3 pr-4"><span className="badge-blue">{t.trackingType}</span></td>
                    <td className="py-3 pr-4">{statusBadge(t.status)}</td>
                    <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell text-xs">
                      {new Date(t.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 flex gap-2">
                      {t.status !== 'expired' && (
                        <Link to={`/tracking/map/${t.token}`} className="text-indigo-400 hover:underline text-xs">Map</Link>
                      )}
                      <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </div>
  )
}

export default Dashboard
