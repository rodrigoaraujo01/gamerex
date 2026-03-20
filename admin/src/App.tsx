import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './lib/supabase'

// ── Missions engine (same logic as game, for ranking calculation) ──
const POINTS_PER_CHECKIN = 10

interface EventInfo {
  id: string
  type: string
  day: number
  room: string | null
  track_code: string | null
  subtrilha: string | null
}

interface FriendInfo {
  friend_id: string
  day: number
}

interface MissionDef {
  id: string
  name: string
  points: number
  check: (c: EventInfo[], f: FriendInfo[]) => boolean
}

const ROOMS = ['Auditório', 'Sala .DAT', 'Sala .LAS', 'Sala .SEGY']

const MISSIONS: MissionDef[] = [
  { id: 'turista_salas', name: 'Turista das Salas', points: 50, check: (c) => {
    for (const d of [1,2,3]) { const rooms = new Set(c.filter(e=>e.type==='oral'&&e.day===d).map(e=>e.room).filter(Boolean)); if(rooms.size>=4) return true }; return false
  }},
  { id: 'maratonista', name: 'Maratonista', points: 40, check: (c) => {
    const targets: Record<number,number> = {1:4,2:5,3:2}
    for (const r of ROOMS) for (const d of [1,2,3]) { if(c.filter(e=>e.type==='oral'&&e.day===d&&e.room===r).length>=(targets[d]??0)) return true }; return false
  }},
  { id: 'fiel_orais', name: 'Fiel às Orais', points: 30, check: (c) => new Set(c.filter(e=>e.type==='oral').map(e=>e.day)).size>=3 },
  { id: 'curioso', name: 'Curioso(a)', points: 30, check: (c) => new Set(c.filter(e=>e.type==='poster').map(e=>e.day)).size>=3 },
  { id: 'explorador', name: 'Explorador(a)', points: 25, check: (c) => { for(const d of[1,2,3]) if(c.filter(e=>e.type==='poster'&&e.day===d).length>=5)return true;return false }},
  { id: 'detetive_posters', name: 'Detetive de Posters', points: 50, check: (c) => { for(const d of[1,2,3]) if(c.filter(e=>e.type==='poster'&&e.day===d).length>=10)return true;return false }},
  { id: 'mestre_posters', name: 'Mestre dos Posters', points: 100, check: (c) => { for(const d of[1,2,3]) if(c.filter(e=>e.type==='poster'&&e.day===d).length>=20)return true;return false }},
  { id: 'early_bird', name: 'Early Bird', points: 50, check: (c) => new Set(c.filter(e=>e.type==='plenaria').map(e=>e.day)).size>=3 },
  { id: 'visitante_expo', name: 'Visitante da Expo', points: 20, check: (c) => c.filter(e=>e.type==='stand').length>=1 },
  { id: 'tour_completo', name: 'Tour Completo', points: 40, check: (c) => { for(const d of[1,2,3]) if(new Set(c.filter(e=>e.type==='stand'&&e.day===d).map(e=>e.room)).size>=3)return true;return false }},
  { id: 'fiel_expo', name: 'Fiel da Expo', points: 40, check: (c) => new Set(c.filter(e=>e.type==='stand').map(e=>e.day)).size>=3 },
  { id: 'expert_expo', name: 'Expert da Expo', points: 80, check: (c) => c.filter(e=>e.type==='stand').length>=9 },
  { id: 'sirr_expert', name: 'SIRR Expert', points: 100, check: (c) => c.filter(e=>e.type==='sirr').length>=4 },
  { id: 'primeiro_contato', name: 'Primeiro Contato', points: 30, check: (_c,f) => new Set(f.map(x=>x.day)).size>=3 },
  { id: 'bff', name: 'BFF', points: 50, check: (_c,f) => {
    const m=new Map<string,Set<number>>(); for(const x of f){if(!m.has(x.friend_id))m.set(x.friend_id,new Set());m.get(x.friend_id)!.add(x.day)} ; for(const s of m.values()) if(s.size>=3)return true;return false
  }},
  { id: 'borboleta_social', name: 'Borboleta Social', points: 25, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=5) return true;return false }},
  { id: 'networker', name: 'Networker', points: 50, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=10) return true;return false }},
  { id: 'influencer', name: 'Influencer', points: 100, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=20) return true;return false }},
  { id: 'super_conector', name: 'Super Conector(a)', points: 80, check: (_c,f) => { let ok=0; for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=5) ok++; return ok>=3 }},
  { id: 'ecletico', name: 'Eclético(a)', points: 30, check: (c) => { const t=new Set(c.filter(e=>e.track_code).map(e=>e.track_code)); return['T1','T2','T3'].every(x=>t.has(x)) }},
  { id: 'guru_ia', name: 'Guru de IA', points: 60, check: (c) => { const s=new Set(c.filter(e=>e.subtrilha?.startsWith('T1')).map(e=>e.subtrilha)); return['T1-1','T1-2','T1-3','T1-4'].every(x=>s.has(x)) }},
  { id: 'mestre_dados', name: 'Mestre dos Dados', points: 60, check: (c) => { const s=new Set(c.filter(e=>e.subtrilha?.startsWith('T2')).map(e=>e.subtrilha)); return['T2-1','T2-2','T2-3'].every(x=>s.has(x)) }},
  { id: 'transversal', name: 'Transversal', points: 60, check: (c) => { const s=new Set(c.filter(e=>e.subtrilha?.startsWith('T3')).map(e=>e.subtrilha)); return['T3-1','T3-2','T3-3','T3-4','T3-5'].every(x=>s.has(x)) }},
  { id: 'combo_dia', name: 'Combo do Dia', points: 40, check: (c) => { for(const d of[1,2,3]){const t=new Set(c.filter(e=>e.day===d).map(e=>e.type));if(t.has('oral')&&t.has('poster')&&t.has('plenaria'))return true};return false }},
  { id: 'presenca_vip', name: 'Presença VIP', points: 20, check: (c,f) => { const d=new Set([...c.map(e=>e.day),...f.map(x=>x.day)]); return[1,2,3].every(x=>d.has(x)) }},
  { id: 'speed_run', name: 'Speed Run', points: 40, check: (c,f) => { for(const d of[1,2,3]){const n=c.filter(e=>e.day===d).length+new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size;if(n>=10)return true};return false }},
]

// completista and rex_supremo depend on others
const ALL_MISSIONS: MissionDef[] = [
  ...MISSIONS,
  { id: 'completista', name: 'Completista', points: 150, check: (c,f) => MISSIONS.filter(m=>m.check(c,f)).length>=10 },
  { id: 'rex_supremo', name: 'REX Supremo', points: 300, check: (c,f) => {
    const others = [...MISSIONS, { id:'completista',name:'',points:0,check:(c2:EventInfo[],f2:FriendInfo[])=>MISSIONS.filter(m=>m.check(c2,f2)).length>=10 }]
    return others.every(m=>m.check(c,f))
  }},
]

// ── Types ──
interface User { id: string; name: string; email: string; created_at: string }
interface Checkin { id: string; user_id: string; event_id: string; created_at: string }
interface FriendCheckin { id: string; user_id: string; friend_id: string; day: number; created_at: string }

// ── Password Gate ──
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'sidare2026'

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1')
      onAuth()
    } else {
      setErr(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-4">🦖 GameREX Admin</h1>
        <input
          type="password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false) }}
          placeholder="Senha"
          className="w-full border rounded-lg px-4 py-2 mb-3"
          autoFocus
        />
        {err && <p className="text-red-500 text-sm mb-2">Senha incorreta</p>}
        <button className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700">
          Entrar
        </button>
      </form>
    </div>
  )
}

// ── Admin Dashboard ──
type Tab = 'dashboard' | 'users' | 'checkins' | 'ranking'

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === '1')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [friendCheckins, setFriendCheckins] = useState<FriendCheckin[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [uRes, cRes, fRes, eRes] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }),
      supabase.from('friend_checkins').select('*'),
      supabase.from('events').select('*'),
    ])
    setUsers((uRes.data ?? []) as User[])
    setCheckins((cRes.data ?? []) as Checkin[])
    setFriendCheckins((fRes.data ?? []) as FriendCheckin[])
    setEvents((eRes.data ?? []) as EventInfo[])
    setLoading(false)
  }, [])

  useEffect(() => { if (authed) loadData() }, [authed, loadData])

  // ── Ranking calculation ──
  const ranking = useMemo(() => {
    const eventMap = new Map(events.map(e => [e.id, e]))

    return users.map(u => {
      const userCheckins = checkins.filter(c => c.user_id === u.id)
      const userFriends = friendCheckins.filter(f => f.user_id === u.id)
      const eventInfos = userCheckins.map(c => eventMap.get(c.event_id)).filter(Boolean) as EventInfo[]
      const friendInfos = userFriends.map(f => ({ friend_id: f.friend_id, day: f.day }))
      const uniqueFriendDays = new Set(userFriends.map(f => `${f.friend_id}-${f.day}`)).size

      const basePoints = userCheckins.length * POINTS_PER_CHECKIN
      const friendPoints = uniqueFriendDays * POINTS_PER_CHECKIN
      const missionBonus = ALL_MISSIONS.reduce((sum, m) => sum + (m.check(eventInfos, friendInfos) ? m.points : 0), 0)
      const completedMissions = ALL_MISSIONS.filter(m => m.check(eventInfos, friendInfos)).length

      return {
        ...u,
        checkinCount: userCheckins.length,
        friendCount: new Set(userFriends.map(f => f.friend_id)).size,
        completedMissions,
        totalPoints: basePoints + friendPoints + missionBonus,
      }
    }).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [users, checkins, friendCheckins, events])

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />

  const checkinsPerDay = [1,2,3].map(d => {
    const dayEvents = events.filter(e => e.day === d)
    const dayEventIds = new Set(dayEvents.map(e => e.id))
    return checkins.filter(c => dayEventIds.has(c.event_id)).length
  })

  const activeUsersPerDay = [1,2,3].map(d => {
    const dayEvents = events.filter(e => e.day === d)
    const dayEventIds = new Set(dayEvents.map(e => e.id))
    const userIds = new Set([
      ...checkins.filter(c => dayEventIds.has(c.event_id)).map(c => c.user_id),
      ...friendCheckins.filter(f => f.day === d).map(f => f.user_id),
    ])
    return userIds.size
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const resetCheckins = async () => {
    if (!window.confirm('⚠️ Tem certeza? Isso vai apagar TODOS os checkins e encontros de amigos de todos os usuários.')) return
    if (!window.confirm('⚠️ Segunda confirmação: esta ação é IRREVERSÍVEL. Continuar?')) return
    setResetting(true)
    try {
      await supabase.from('friend_checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await loadData()
    } catch (e) {
      alert('Erro ao resetar checkins: ' + (e as Error).message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm relative">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">🦖 GameREX Admin</h1>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {(['dashboard', 'users', 'checkins', 'ranking'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm capitalize ${
                  tab === t ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
            <button onClick={loadData} className="ml-4 text-sm text-blue-600 hover:underline">
              🔄 Atualizar
            </button>
          </nav>
          {/* Hamburger button (mobile) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="md:hidden border-t bg-white px-4 py-2 flex flex-col gap-1">
            {(['dashboard', 'users', 'checkins', 'ranking'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setMenuOpen(false) }}
                className={`px-4 py-2 rounded-lg text-sm capitalize text-left ${
                  tab === t ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => { loadData(); setMenuOpen(false) }}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 rounded-lg text-left"
            >
              🔄 Atualizar
            </button>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-500 text-center py-12">Carregando...</p>
        ) : (
          <>
            {/* Dashboard */}
            {tab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Usuários" value={users.length} />
                  <StatCard label="Checkins (eventos)" value={checkins.length} />
                  <StatCard label="Checkins (amigos)" value={friendCheckins.length} />
                  <StatCard label="Eventos" value={events.length} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Por dia</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[1,2,3].map(d => (
                      <div key={d} className="bg-white rounded-xl border p-4">
                        <p className="text-sm text-gray-500">Dia {d} ({22+d}/mar)</p>
                        <p className="text-xl font-bold">{activeUsersPerDay[d-1]} jogadores</p>
                        <p className="text-sm text-gray-500">{checkinsPerDay[d-1]} checkins</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <button
                    onClick={resetCheckins}
                    disabled={resetting}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {resetting ? '⏳ Resetando...' : '🗑️ Resetar Todos os Checkins'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Remove todos os checkins de eventos e amigos. Usuários são mantidos.</p>
                </div>
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600">Nome</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Cadastro</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ranking.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{u.name}</td>
                        <td className="px-4 py-2 text-gray-500">{u.email}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(u.created_at).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">{u.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Checkins */}
            {tab === 'checkins' && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600">Usuário</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Evento</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {checkins.slice(0, 200).map(c => {
                      const user = users.find(u => u.id === c.user_id)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{user?.name ?? c.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-2 font-mono text-xs">{c.event_id}</td>
                          <td className="px-4 py-2 text-gray-500">{new Date(c.created_at).toLocaleString('pt-BR')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {checkins.length > 200 && (
                  <p className="text-gray-400 text-sm text-center py-3">Mostrando 200 de {checkins.length}</p>
                )}
              </div>
            )}

            {/* Ranking */}
            {tab === 'ranking' && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600 w-12">#</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Nome</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Checkins</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Amigos</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Missões</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ranking.map((u, i) => (
                      <tr key={u.id} className={`hover:bg-gray-50 ${i < 3 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-2 font-bold text-gray-400">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium">{u.name}</td>
                        <td className="px-4 py-2 text-right">{u.checkinCount}</td>
                        <td className="px-4 py-2 text-right">{u.friendCount}</td>
                        <td className="px-4 py-2 text-right">{u.completedMissions}/{ALL_MISSIONS.length}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600">{u.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
