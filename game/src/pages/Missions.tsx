import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { MISSIONS, CATEGORY_LABELS, CATEGORY_ORDER, COORDINATOR_EMAILS } from '../lib/missions'
import { useGameData, type FriendInfo } from '../lib/useGameData'
import { supabase, type EventRow } from '../lib/supabase'
import Navbar from '../components/Navbar'

interface StepInfo { label: string; done: boolean }

const DAY_LABELS = ['Dia 1 (23/mar)', 'Dia 2 (24/mar)', 'Dia 3 (25/mar)']
function dayLabel(i: number): string { return DAY_LABELS[i] ?? `Dia ${i + 1}` }
const SUB_LABELS: Record<string, string> = {
  'T1-1': 'Aplicações de IA', 'T1-2': 'Chats e Agentes',
  'T1-3': 'Demos IA', 'T1-4': 'Scientific ML',
  'T2-1': 'Governança', 'T2-2': 'Arquitetura', 'T2-3': 'Qualidade',
  'T3-1': 'Gestão Mudança', 'T3-2': 'Gestão Conhecimento',
  'T3-3': 'IA Responsável', 'T3-4': 'HPC/Pipelines', 'T3-5': 'MLOps',
}

type EventInfo = { id: string; type: string; day: number; room: string | null; track_code: string | null; subtrilha: string | null }

interface CoordinatorInfo { id: string; name: string }

function getMissionSteps(id: string, events: EventInfo[], friends: FriendInfo[], coordinators?: CoordinatorInfo[]): StepInfo[] | null {
  const byType = (t: string) => events.filter(e => e.type === t)

  switch (id) {
    case 'turista_salas': {
      const ROOMS = ['Auditório', 'Sala .DAT', 'Sala .LAS', 'Sala .SEGY']
      let bestDay = 1, bestCount = 0
      for (const d of [1, 2, 3]) {
        const rooms = new Set(byType('oral').filter(e => e.day === d).map(e => e.room).filter(Boolean))
        if (rooms.size > bestCount) { bestCount = rooms.size; bestDay = d }
      }
      return ROOMS.map(r => ({ label: `${r} — ${dayLabel(bestDay - 1)}`, done: byType('oral').some(e => e.day === bestDay && e.room === r) }))
    }
    case 'maratonista': {
      const ROOMS = ['Auditório', 'Sala .DAT', 'Sala .LAS', 'Sala .SEGY']
      const targets: Record<number, number> = { 1: 4, 2: 5, 3: 2 }
      let bestRoom = ROOMS[0], bestDay = 1, bestRatio = 0
      for (const r of ROOMS) for (const d of [1, 2, 3]) {
        const got = byType('oral').filter(e => e.day === d && e.room === r).length
        const ratio = got / (targets[d] ?? 1)
        if (ratio > bestRatio) { bestRatio = ratio; bestRoom = r; bestDay = d }
      }
      const target = targets[bestDay] ?? 4
      const got = byType('oral').filter(e => e.day === bestDay && e.room === bestRoom).length
      return Array.from({ length: target }, (_, i) => ({ label: `Oral ${i + 1} — ${bestRoom} (${dayLabel(bestDay - 1)})`, done: i < got }))
    }
    case 'fiel_orais':
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: byType('oral').some(e => e.day === d) }))
    case 'curioso':
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: byType('poster').some(e => e.day === d) }))
    case 'early_bird':
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: byType('plenaria').some(e => e.day === d) }))
    case 'tour_completo': {
      const STANDS = ['Stand 1', 'Stand 2', 'Stand 3']
      let bestDay = 1, bestCount = 0
      for (const d of [1, 2, 3]) {
        const rooms = new Set(byType('stand').filter(e => e.day === d).map(e => e.room))
        if (rooms.size > bestCount) { bestCount = rooms.size; bestDay = d }
      }
      return STANDS.map(s => ({ label: `${s} — ${dayLabel(bestDay - 1)}`, done: byType('stand').some(e => e.day === bestDay && e.room === s) }))
    }
    case 'fiel_expo':
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: byType('stand').some(e => e.day === d) }))
    case 'expert_expo':
      return [1, 2, 3].flatMap((d, i) =>
        ['Stand 1', 'Stand 2', 'Stand 3'].map(s => ({ label: `${s} — ${dayLabel(i)}`, done: byType('stand').some(e => e.day === d && e.room === s) }))
      )
    case 'primeiro_contato':
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: friends.some(f => f.day === d) }))
    case 'bff': {
      const friendDays = new Map<string, Set<number>>()
      for (const fc of friends) {
        if (!friendDays.has(fc.friend_id)) friendDays.set(fc.friend_id, new Set())
        friendDays.get(fc.friend_id)!.add(fc.day)
      }
      let bestSize = 0
      for (const days of friendDays.values()) bestSize = Math.max(bestSize, days.size)
      return [1, 2, 3].map((d, i) => {
        let met = false
        for (const [, days] of friendDays) { if (days.size === bestSize && days.has(d)) { met = true; break } }
        return { label: dayLabel(i), done: met }
      })
    }
    case 'super_conector':
      return [1, 2, 3].map((d, i) => {
        const count = new Set(friends.filter(fc => fc.day === d).map(fc => fc.friend_id)).size
        return { label: `${dayLabel(i)} — ${count}/5 amigos`, done: count >= 5 }
      })
    case 'ecletico':
      return [
        { label: 'Trilha 1 — IA', done: events.some(e => e.track_code === 'T1') },
        { label: 'Trilha 2 — Dados', done: events.some(e => e.track_code === 'T2') },
        { label: 'Trilha 3 — Gestão', done: events.some(e => e.track_code === 'T3') },
      ]
    case 'guru_ia': {
      const subs = new Set(events.filter(e => e.subtrilha?.startsWith('T1')).map(e => e.subtrilha))
      return ['T1-1', 'T1-2', 'T1-3', 'T1-4'].map(s => ({ label: SUB_LABELS[s]!, done: subs.has(s) }))
    }
    case 'mestre_dados': {
      const subs = new Set(events.filter(e => e.subtrilha?.startsWith('T2')).map(e => e.subtrilha))
      return ['T2-1', 'T2-2', 'T2-3'].map(s => ({ label: SUB_LABELS[s]!, done: subs.has(s) }))
    }
    case 'transversal': {
      const subs = new Set(events.filter(e => e.subtrilha?.startsWith('T3')).map(e => e.subtrilha))
      return ['T3-1', 'T3-2', 'T3-3', 'T3-4', 'T3-5'].map(s => ({ label: SUB_LABELS[s]!, done: subs.has(s) }))
    }
    case 'combo_dia': {
      let bestDay = 1, bestCount = 0
      for (const d of [1, 2, 3]) {
        const types = new Set(events.filter(e => e.day === d).map(e => e.type))
        const count = ['oral', 'poster', 'plenaria'].filter(t => types.has(t)).length
        if (count > bestCount) { bestCount = count; bestDay = d }
      }
      const bestTypes = new Set(events.filter(e => e.day === bestDay).map(e => e.type))
      return [
        { label: `🎤 Oral — ${dayLabel(bestDay - 1)}`, done: bestTypes.has('oral') },
        { label: `🖼️ Poster — ${dayLabel(bestDay - 1)}`, done: bestTypes.has('poster') },
        { label: `🎙️ Plenária — ${dayLabel(bestDay - 1)}`, done: bestTypes.has('plenaria') },
      ]
    }
    case 'presenca_vip': {
      const allDays = new Set([...events.map(e => e.day), ...friends.map(f => f.day)])
      return [1, 2, 3].map((d, i) => ({ label: dayLabel(i), done: allDays.has(d) }))
    }
    case 'sirr_expert': {
      const ids = new Set(byType('sirr').map(e => e.id))
      return [
        { label: 'Quem é você no SIRR Web', done: ids.has('SIRR1') },
        { label: 'Buscando dados no SIRR Web', done: ids.has('SIRR2') },
        { label: 'Encontrando o que eu preciso no SIRR Web', done: ids.has('SIRR3') },
        { label: 'Produtividade com SIRR Web', done: ids.has('SIRR4') },
      ]
    }
    case 'geolinker': {
      const ids = new Set(byType('geolink').map(e => e.id))
      return [
        { label: 'Confira a Documentação do GeoLink', done: ids.has('GL1') },
        { label: 'Veja o exemplo de demonstração oficial', done: ids.has('GL2') },
        { label: 'Descubra como monitorar sua solução', done: ids.has('GL3') },
      ]
    }
    case 'explorador_geolink': {
      const ids = new Set(byType('geolink').map(e => e.id))
      return [
        { label: 'Descubra o Hub de Soluções do GeoLink', done: ids.has('GL4') },
        { label: 'Classificação de Cavings com IA ou Petrofísica', done: ids.has('GL5') },
        { label: 'Explorador de Dados do OSDU ou Situação Operacional de Poços', done: ids.has('GL6') },
        { label: 'Multipoços com EletroAI ou Detector de Círculos de Fadas', done: ids.has('GL7') },
      ]
    }
    case 'lideres_supremas': {
      if (!coordinators || coordinators.length === 0) return null
      const metIds = new Set(friends.map(f => f.friend_id))
      return coordinators.map(c => ({ label: `Encontrar ${c.name}`, done: metIds.has(c.id) }))
    }
    default:
      return null
  }
}

const COORD_NAMES: Record<string, string> = {
  'samya.pinheiro@petrobras.com.br': 'Samya',
  'danyella.carvalho@petrobras.com.br': 'Danyella',
  'carolcaetano@petrobras.com.br': 'Caroline',
}

export default function Missions() {
  const { refreshData } = useAuth()
  const { checkinEvents, friendInfos, missionResults: baseMissionResults } = useGameData()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [coordinators, setCoordinators] = useState<CoordinatorInfo[]>([])
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => { refreshData() }, [refreshData])

  useEffect(() => {
    supabase
      .from('users')
      .select('id, email')
      .in('email', COORDINATOR_EMAILS)
      .then(({ data }) => {
        if (data) setCoordinators(data.map((u: { id: string; email: string }) => ({ id: u.id, name: COORD_NAMES[u.email] ?? u.email })))
      })
  }, [])

  const missionResults = useMemo(() =>
    baseMissionResults.map(m => ({
      ...m,
      steps: getMissionSteps(m.id, checkinEvents as EventRow[], friendInfos, coordinators),
    })),
    [baseMissionResults, checkinEvents, friendInfos, coordinators]
  )

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof missionResults>()
    for (const cat of CATEGORY_ORDER) {
      groups.set(cat, missionResults.filter(m => m.category === cat))
    }
    return groups
  }, [missionResults])

  const completedCount = missionResults.filter(m => m.result.done).length

  const CATEGORY_SHORT: Record<string, string> = {
    oral: 'Orais',
    poster: 'Posters',
    plenaria: 'Plenárias',
    stand: 'Expo',
    networking: 'Social',
    trilha: 'Trilhas',
    special: 'Especiais',
  }

  const scrollToSection = (cat: string) => {
    sectionRefs.current.get(cat)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-dvh pb-nav-safe page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4 pt-safe">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white font-semibold text-lg">Missões</h1>
          <p className="text-gray-500 text-sm">{completedCount}/{MISSIONS.length} completas</p>
        </div>
      </div>

      {/* Category summary cards */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_ORDER.map(cat => {
            const missions = grouped.get(cat)
            if (!missions || missions.length === 0) return null
            const done = missions.filter(m => m.result.done).length
            const allDone = done === missions.length
            return (
              <button
                key={cat}
                onClick={() => scrollToSection(cat)}
                className={`bg-rex-card border rounded-xl px-2 py-2 text-center transition-colors ${
                  allDone ? 'border-rex-amber' : 'border-rex-border hover:border-rex-green/30'
                }`}
              >
                <p className={`text-sm font-bold ${allDone ? 'text-rex-amber' : 'text-white'}`}>{done}/{missions.length}</p>
                <p className="text-gray-500 text-xs whitespace-nowrap">{CATEGORY_SHORT[cat]}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {CATEGORY_ORDER.map(cat => {
          const missions = grouped.get(cat)
          if (!missions || missions.length === 0) return null
          return (
            <div key={cat} ref={el => { if (el) sectionRefs.current.set(cat, el) }}>
              <h2 className="text-gray-300 font-medium text-sm mb-3">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="space-y-2">
                {missions.map(m => {
                  const pct = m.result.total > 0 ? (m.result.progress / m.result.total) * 100 : 0
                  const isExpanded = expandedId === m.id
                  const hasSteps = m.steps !== null

                  return (
                    <div
                      key={m.id}
                      className={`bg-rex-card border rounded-xl p-4 transition-colors ${
                        m.result.done ? 'border-rex-green/40' : 'border-rex-border'
                      } ${hasSteps ? 'cursor-pointer active:bg-white/5' : ''}`}
                      onClick={() => hasSteps && setExpandedId(isExpanded ? null : m.id)}
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
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold whitespace-nowrap ${
                            m.result.done ? 'text-rex-green' : 'text-rex-amber'
                          }`}>
                            {m.points} pts
                          </span>
                          {hasSteps && (
                            <span className={`text-gray-500 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              ▾
                            </span>
                          )}
                        </div>
                      </div>

                      {!m.result.done && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progresso</span>
                            <span>{m.result.progress}/{m.result.total}</span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4ade80 0%, #fbbf24 100%)' }}
                            />
                          </div>
                        </div>
                      )}

                      {isExpanded && m.steps && (
                        <div className="mt-3 pt-3 border-t border-rex-border/50 space-y-1.5">
                          {m.steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`text-xs ${step.done ? 'text-rex-green' : 'text-gray-600'}`}>
                                {step.done ? '●' : '○'}
                              </span>
                              <span className={`text-xs ${step.done ? 'text-gray-300' : 'text-gray-500'}`}>
                                {step.label}
                              </span>
                            </div>
                          ))}
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
