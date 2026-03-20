import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type UserRow } from '../lib/supabase'
import { getTypeEmoji, getTypeLabel, getDayLabel, getTrackLabel } from '../lib/dayUtils'
import { POINTS_PER_CHECKIN, CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/missions'
import { useGameData } from '../lib/useGameData'
import Navbar from '../components/Navbar'

export default function History() {
  const { checkins, friendCheckins, refreshData } = useAuth()
  const { eventInfoMap, completedMissions, uniqueFriends } = useGameData()
  const [friendNames, setFriendNames] = useState<Map<string, string>>(new Map())
  const [tab, setTab] = useState<'events' | 'friends' | 'missions'>('events')

  useEffect(() => { refreshData() }, [refreshData])

  // Load friend names
  useEffect(() => {
    const friendIds = [...new Set(friendCheckins.map(f => f.friend_id))]
    if (friendIds.length === 0) return

    supabase
      .from('users')
      .select('id, name')
      .in('id', friendIds)
      .then(({ data }) => {
        if (data) {
          setFriendNames(new Map((data as UserRow[]).map(u => [u.id, u.name])))
        }
      })
  }, [friendCheckins])

  const sortedCheckins = useMemo(() =>
    [...checkins].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [checkins]
  )

  const sortedFriends = useMemo(() =>
    [...friendCheckins].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [friendCheckins]
  )

  return (
    <div className="min-h-dvh pb-nav-safe page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4 pt-safe">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white font-semibold text-lg">Histórico</h1>
          <p className="text-gray-500 text-sm">
            {checkins.length} eventos · {uniqueFriends} amigos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-rex-card border border-rex-border rounded-xl p-1">
          <button
            onClick={() => setTab('events')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              tab === 'events'
                ? 'bg-rex-green/20 text-rex-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📌 Eventos ({checkins.length})
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              tab === 'friends'
                ? 'bg-rex-green/20 text-rex-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🤝 Amigos ({uniqueFriends})
          </button>
          <button
            onClick={() => setTab('missions')}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              tab === 'missions'
                ? 'bg-rex-green/20 text-rex-green'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🎯 Missões ({completedMissions.length})
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {tab === 'events' && (
          sortedCheckins.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum checkin ainda</p>
          ) : (
            sortedCheckins.map(c => {
              const ev = eventInfoMap.get(c.event_id)
              const time = new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={c.id} className="bg-rex-card border border-rex-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">{ev ? getTypeEmoji(ev.type) : '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{c.event_id}</p>
                    <p className="text-gray-500 text-xs">
                      {ev ? `${getTypeLabel(ev.type)} · ${ev.room ?? 'Plenário'} · ${getDayLabel(ev.day)}${ev.track_code ? ` · ${getTrackLabel(ev.track_code)}` : ''}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-rex-green text-sm">+{POINTS_PER_CHECKIN}</p>
                    <p className="text-gray-600 text-xs">{time}</p>
                  </div>
                </div>
              )
            })
          )
        )}

        {tab === 'friends' && (
          sortedFriends.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum encontro ainda</p>
          ) : (
            sortedFriends.map(f => {
              const time = new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={f.id} className="bg-rex-card border border-rex-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">🤝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {friendNames.get(f.friend_id) ?? 'Carregando...'}
                    </p>
                    <p className="text-gray-500 text-xs">{getDayLabel(f.day)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-rex-green text-sm">+{POINTS_PER_CHECKIN}</p>
                    <p className="text-gray-600 text-xs">{time}</p>
                  </div>
                </div>
              )
            })
          )
        )}

        {tab === 'missions' && (
          completedMissions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma missão concluída ainda</p>
          ) : (
            <>
              {CATEGORY_ORDER.map(cat => {
                const catMissions = completedMissions.filter(m => m.category === cat)
                if (catMissions.length === 0) return null
                return (
                  <div key={cat} className="mb-4">
                    <p className="text-gray-400 text-xs font-medium mb-2">{CATEGORY_LABELS[cat]}</p>
                    <div className="space-y-2">
                      {catMissions.map(m => (
                        <div key={m.id} className="bg-rex-card border border-rex-green/30 rounded-xl px-4 py-3 flex items-center gap-3">
                          <span className="text-lg">✅</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-rex-green text-sm font-medium">{m.name}</p>
                            <p className="text-gray-500 text-xs">{m.description}</p>
                          </div>
                          <span className="text-rex-amber text-sm font-semibold">+{m.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )
        )}
      </div>

      <Navbar />
    </div>
  )
}
