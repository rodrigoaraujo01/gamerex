import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { POINTS_PER_CHECKIN, getPlayerLevel } from '../lib/missions'
import { useGameData } from '../lib/useGameData'
import { getTypeEmoji, getTrackLabel } from '../lib/dayUtils'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const { user, checkins, friendCheckins, refreshData } = useAuth()
  const {
    eventInfoMap,
    totalPoints,
    completedMissions,
    uniqueFriends,
    nextMission,
  } = useGameData()

  useEffect(() => { refreshData() }, [refreshData])

  const level = useMemo(() => getPlayerLevel(totalPoints), [totalPoints])

  const levelProgress = useMemo(() => {
    if (!level.nextLevel) return 100
    const range = level.nextLevel.minPoints - level.minPoints
    const progress = totalPoints - level.minPoints
    return Math.min(Math.round((progress / range) * 100), 100)
  }, [totalPoints, level])

  const recentCheckins = useMemo(() =>
    [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [checkins]
  )

  if (!user) return null

  return (
    <div className="min-h-dvh pb-nav-safe page-enter">
      {/* Header */}
      <div className="bg-rex-card border-b border-rex-border px-4 py-5 pt-safe">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-lg">{user.name}</p>
            <p className="text-gray-400 text-sm">{level.emoji} {level.title}</p>
          </div>
          <Link
            to="/rules"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-rex-bg border border-rex-border hover:border-rex-green/50 transition-colors"
            title="Como Jogar"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Points card + level progress */}
        <div className="bg-rex-card border border-rex-border rounded-2xl p-5 text-center shimmer">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Pontuação Total</p>
          <p className="font-game text-rex-green text-3xl">{totalPoints}</p>
          <p className="text-gray-500 text-xs mt-1">pts</p>
          {level.nextLevel && (
            <div className="mt-3 px-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{level.emoji} {level.title}</span>
                <span>{level.nextLevel.emoji} {level.nextLevel.title}</span>
              </div>
              <div className="level-progress">
                <div
                  className="level-progress-fill bg-gradient-to-r from-rex-green/60 to-rex-green"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <p className="text-gray-600 text-xs mt-1">
                {level.nextLevel.minPoints - totalPoints} pts para o próximo nível
              </p>
            </div>
          )}
          {!level.nextLevel && (
            <p className="text-rex-amber text-xs mt-2">👑 Nível máximo!</p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 flex flex-col items-center">
            <svg className="w-5 h-5 text-rex-green mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
              <path d="M9 4v6" />
              <path d="M15 4v6" />
              <path d="M9 16l2 2 4-4" />
            </svg>
            <p className="text-xl font-bold text-white">{checkins.length}</p>
            <p className="text-gray-500 text-xs">Check-ins</p>
          </div>
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 flex flex-col items-center">
            <svg className="w-5 h-5 text-rex-green mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-xl font-bold text-white">{uniqueFriends}</p>
            <p className="text-gray-500 text-xs">Friends</p>
          </div>
          <div className="bg-rex-card border border-rex-border rounded-xl p-3 flex flex-col items-center">
            <svg className="w-5 h-5 text-rex-green mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <p className="text-xl font-bold text-white">{completedMissions.length}</p>
            <p className="text-gray-500 text-xs">Missions</p>
          </div>
        </div>

        {/* Next mission suggestion */}
        {nextMission && (
          <Link to="/missions" className="block bg-rex-card border border-rex-amber/30 rounded-xl p-4 hover:border-rex-amber/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-rex-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <p className="text-rex-amber text-xs uppercase tracking-wider font-medium">Quase lá!</p>
            </div>
            <p className="text-white text-sm font-medium">{nextMission.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{nextMission.description}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progresso</span>
                <span>{nextMission.result.progress}/{nextMission.result.total}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill bg-rex-amber/60"
                  style={{ width: `${(nextMission.result.progress / nextMission.result.total) * 100}%` }}
                />
              </div>
            </div>
          </Link>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/myqr"
            className="bg-rex-card border border-rex-border rounded-xl p-4 flex flex-col items-center hover:border-rex-green/50 transition-colors"
          >
            <svg className="w-7 h-7 text-rex-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="3" height="3" />
              <path d="M21 14h-3v3" />
              <path d="M18 21h3v-3" />
            </svg>
            <p className="text-gray-300 text-sm mt-1">Meu QR Code</p>
          </Link>
          <Link
            to="/ranking"
            className="bg-rex-card border border-rex-border rounded-xl p-4 flex flex-col items-center hover:border-rex-amber/50 transition-colors"
          >
            <svg className="w-7 h-7 text-rex-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <p className="text-gray-300 text-sm mt-1">Ranking</p>
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
