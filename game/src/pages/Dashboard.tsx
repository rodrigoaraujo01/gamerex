import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { MISSIONS, POINTS_PER_CHECKIN, calculateTotalPoints } from '../lib/missions'
import { getTypeEmoji, getTrackLabel } from '../lib/dayUtils'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user, checkins, friendCheckins, events, refreshData } = useAuth()

  useEffect(() => { refreshData() }, [refreshData])

  const eventInfoMap = useMemo(() => {
    const map = new Map(events.map(e => [e.id, e]))
    return map
  }, [events])

  const checkinEvents = useMemo(() =>
    checkins.map(c => eventInfoMap.get(c.event_id)).filter(Boolean),
    [checkins, eventInfoMap]
  )

  const friendInfos = useMemo(() =>
    friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day })),
    [friendCheckins]
  )

  const totalPoints = useMemo(() =>
    calculateTotalPoints(checkins, friendCheckins, checkinEvents as any, friendInfos),
    [checkins, friendCheckins, checkinEvents, friendInfos]
  )

  const completedMissions = useMemo(() =>
    MISSIONS.filter(m => m.check(checkinEvents as any, friendInfos).done).length,
    [checkinEvents, friendInfos]
  )

  const uniqueFriends = useMemo(() =>
    new Set(friendCheckins.map(f => f.friend_id)).size,
    [friendCheckins]
  )

  const recentCheckins = useMemo(() =>
    [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [checkins]
  )

  if (!user) return null

  return (
    <div className="min-h-dvh pb-20 page-enter">
      {/* Header */}
      <div className="bg-rex-card border-b border-rex-border px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-gray-400 text-sm">Olá,</p>
          <p className="text-white font-semibold text-lg">{user.name} 🦖</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Points card */}
        <div className="bg-rex-card border border-rex-border rounded-2xl p-5 text-center shimmer">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Pontuação Total</p>
          <p className="font-game text-rex-green text-3xl">{totalPoints}</p>
          <p className="text-gray-500 text-xs mt-1">pts</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{checkins.length}</p>
            <p className="text-gray-500 text-xs">Checkins</p>
          </div>
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{uniqueFriends}</p>
            <p className="text-gray-500 text-xs">Amigos</p>
          </div>
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-rex-amber">{completedMissions}</p>
            <p className="text-gray-500 text-xs">Missões</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/myqr"
            className="bg-rex-card border border-rex-border rounded-xl p-4 text-center hover:border-rex-green/50 transition-colors"
          >
            <span className="text-2xl">📱</span>
            <p className="text-gray-300 text-sm mt-1">Meu QR Code</p>
          </Link>
          <Link
            to="/missions"
            className="bg-rex-card border border-rex-border rounded-xl p-4 text-center hover:border-rex-amber/50 transition-colors"
          >
            <span className="text-2xl">🎯</span>
            <p className="text-gray-300 text-sm mt-1">Missões</p>
          </Link>
        </div>

        {/* Recent checkins */}
        {recentCheckins.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-400 text-sm font-medium">Últimos Checkins</h3>
              <Link to="/history" className="text-rex-green text-xs hover:underline">Ver todos</Link>
            </div>
            <div className="space-y-2">
              {recentCheckins.map(c => {
                const ev = eventInfoMap.get(c.event_id)
                const time = new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const date = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                return (
                  <div key={c.id} className="bg-rex-card border border-rex-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">{ev ? getTypeEmoji(ev.type) : '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{c.event_id}</p>
                      <p className="text-gray-500 text-xs">
                        {ev?.room ?? (ev?.type === 'poster' ? 'Área de Posters' : ev?.type === 'stand' ? 'Mini-Expo' : 'Plenário')}
                        {ev?.track_code ? ` · ${getTrackLabel(ev.track_code)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-rex-green text-sm font-medium">+{POINTS_PER_CHECKIN}</p>
                      <p className="text-gray-600 text-xs">{date} {time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {checkins.length === 0 && friendCheckins.length === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📷</p>
            <p className="text-gray-400 text-sm">Escaneie um QR Code para começar!</p>
            <p className="text-gray-600 text-xs mt-1">
              Os QR Codes estão nos stands, posters e apresentações
            </p>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}
