import { useEffect, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { MISSIONS, CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/missions'
import Navbar from '../components/Navbar'

export default function Missions() {
  const { checkins, friendCheckins, events, refreshData } = useAuth()

  useEffect(() => { refreshData() }, [refreshData])

  const eventInfoMap = useMemo(() => new Map(events.map(e => [e.id, e])), [events])

  const checkinEvents = useMemo(() =>
    checkins.map(c => eventInfoMap.get(c.event_id)).filter(Boolean),
    [checkins, eventInfoMap]
  )

  const friendInfos = useMemo(() =>
    friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day })),
    [friendCheckins]
  )

  const missionResults = useMemo(() =>
    MISSIONS.map(m => ({
      ...m,
      result: m.check(checkinEvents as any, friendInfos),
    })),
    [checkinEvents, friendInfos]
  )

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof missionResults>()
    for (const cat of CATEGORY_ORDER) {
      groups.set(cat, missionResults.filter(m => m.category === cat))
    }
    return groups
  }, [missionResults])

  const completedCount = missionResults.filter(m => m.result.done).length

  return (
    <div className="min-h-dvh pb-20 page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white font-semibold text-lg">Missões</h1>
          <p className="text-gray-500 text-sm">{completedCount}/{MISSIONS.length} completas</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {CATEGORY_ORDER.map(cat => {
          const missions = grouped.get(cat)
          if (!missions || missions.length === 0) return null
          return (
            <div key={cat}>
              <h2 className="text-gray-300 font-medium text-sm mb-3">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="space-y-2">
                {missions.map(m => {
                  const pct = m.result.total > 0 ? (m.result.progress / m.result.total) * 100 : 0
                  return (
                    <div
                      key={m.id}
                      className={`bg-rex-card border rounded-xl p-4 transition-colors ${
                        m.result.done
                          ? 'border-rex-green/40'
                          : 'border-rex-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {m.result.done && <span className="text-rex-green">✓</span>}
                            <p className={`text-sm font-medium ${m.result.done ? 'text-rex-green' : 'text-white'}`}>
                              {m.name}
                            </p>
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">{m.description}</p>
                        </div>
                        <span className={`text-sm font-semibold whitespace-nowrap ${
                          m.result.done ? 'text-rex-green' : 'text-rex-amber'
                        }`}>
                          {m.points} pts
                        </span>
                      </div>

                      {!m.result.done && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progresso</span>
                            <span>{m.result.progress}/{m.result.total}</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill bg-rex-green/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Navbar />
    </div>
  )
}
