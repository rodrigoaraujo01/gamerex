import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './lib/supabase'

async function fetchAll<T>(table: string, orderCol?: string, ascending?: boolean): Promise<T[]> {
  const PAGE = 1000
  let all: T[] = []
  let from = 0
  while (true) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (orderCol) q = q.order(orderCol, { ascending: ascending ?? true })
    const { data } = await q
    if (!data || data.length === 0) break
    all = all.concat(data as T[])
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

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
  check: (c: EventInfo[], f: FriendInfo[], coordIds?: Set<string>) => boolean
}

const COORDINATOR_EMAILS = [
  'samya.pinheiro@petrobras.com.br',
  'danyella.carvalho@petrobras.com.br',
  'carolcaetano@petrobras.com.br',
]

const ROOMS = ['Auditório', 'Sala .DAT', 'Sala .LAS', 'Sala .SEGY']

// Events cancelled — ignore any checkins on these QR codes
const CANCELLED_EVENTS = new Set(['A0006', 'A0022'])

const MISSIONS: MissionDef[] = [
  { id: 'turista_salas', name: 'Turista das Salas', points: 50, check: (c) => {
    for (const d of [1,2,3]) { const rooms = new Set(c.filter(e=>e.type==='oral'&&e.day===d).map(e=>e.room).filter(Boolean)); if(rooms.size>=4) return true }; return false
  }},
  { id: 'maratonista', name: 'Maratonista', points: 40, check: (c) => {
    const targets: Record<string,Record<number,number>> = {}; for(const r of ROOMS) targets[r] = r==='Sala .LAS' ? {1:4,2:5,3:0} : {1:4,2:5,3:2}
    for (const r of ROOMS) for (const d of [1,2,3]) { const t=targets[r]![d]!; if(t>0&&c.filter(e=>e.type==='oral'&&e.day===d&&e.room===r).length>=t) return true }; return false
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
  { id: 'fiel_posters_d1', name: 'Fiel aos Posters — Dia 1', points: 50, check: (c) => c.filter(e=>e.type==='poster'&&e.day===1).length>=20 },
  { id: 'fiel_posters_d2', name: 'Fiel aos Posters — Dia 2', points: 50, check: (c) => c.filter(e=>e.type==='poster'&&e.day===2).length>=20 },
  { id: 'fiel_posters_d3', name: 'Fiel aos Posters — Dia 3', points: 50, check: (c) => c.filter(e=>e.type==='poster'&&e.day===3).length>=20 },
  { id: 'colecionador_posters', name: 'Colecionador(a) de Posters', points: 200, check: (c) => c.filter(e=>e.type==='poster').length>=60 },
  { id: 'sirr_expert', name: 'SIRR Expert', points: 100, check: (c) => c.filter(e=>e.type==='sirr').length>=4 },
  { id: 'geolinker', name: 'GeoLinker', points: 100, check: (c) => { const ids=new Set(c.filter(e=>e.type==='geolink').map(e=>e.id)); return['GL1','GL2','GL3'].every(id=>ids.has(id)) }},
  { id: 'explorador_geolink', name: 'Explorador de Soluções do GeoLink', points: 100, check: (c) => { const ids=new Set(c.filter(e=>e.type==='geolink').map(e=>e.id)); return['GL4','GL5','GL6','GL7'].every(id=>ids.has(id)) }},
  { id: 'cacando_dado', name: 'Caçando o Dado', points: 100, check: (c) => { const ids=new Set(c.filter(e=>e.type==='dado').map(e=>e.id)); return['CD1','CD2','CD3'].every(id=>ids.has(id)) }},
  { id: 'poco_ideias', name: 'Poço das ideias', points: 100, check: (c) => { const sIds=new Set(c.filter(e=>e.type==='stand').map(e=>e.id)); const pIds=new Set(c.filter(e=>e.type==='poco').map(e=>e.id)); return sIds.has('STAND-2-D1')&&pIds.has('POCO1') }},
  { id: 'fui_em_atenas', name: 'Fui em Atenas e voltei', points: 100, check: (c) => { const sIds=new Set(c.filter(e=>e.type==='stand').map(e=>e.id)); const aIds=new Set(c.filter(e=>e.type==='agora').map(e=>e.id)); return sIds.has('STAND-1-D3')&&aIds.has('AG1')&&aIds.has('AG2') }},
  { id: 'quiz_gamee', name: 'Quiz GAMEE', points: 100, check: (c) => { const sIds=new Set(c.filter(e=>e.type==='stand').map(e=>e.id)); const gIds=new Set(c.filter(e=>e.type==='gamee').map(e=>e.id)); return sIds.has('STAND-2-D2')&&gIds.has('GAMEE1') }},
  { id: 'quiz_camalis', name: 'Quiz CAMÁLIS', points: 100, check: (c) => { const sIds=new Set(c.filter(e=>e.type==='stand').map(e=>e.id)); const cIds=new Set(c.filter(e=>e.type==='camalis').map(e=>e.id)); return sIds.has('STAND-2-D2')&&cIds.has('CAMALIS1') }},
  { id: 'happy_hour', name: 'Do Dado ao Barril', points: 50, check: (c) => c.filter(e=>e.type==='happyhour').length>=1 },
  { id: 'lideres_supremas', name: 'Líderes Supremas', points: 100, check: (_c,f,coordIds) => {
    if(!coordIds || coordIds.size===0) return false
    const met = new Set<string>(); for(const x of f) if(coordIds.has(x.friend_id)) met.add(x.friend_id); return met.size>=3
  }},
  { id: 'primeiro_contato', name: 'Primeiro Contato', points: 30, check: (_c,f) => new Set(f.map(x=>x.day)).size>=3 },
  { id: 'bff', name: 'BFF', points: 50, check: (_c,f) => {
    const m=new Map<string,Set<number>>(); for(const x of f){if(!m.has(x.friend_id))m.set(x.friend_id,new Set());m.get(x.friend_id)!.add(x.day)} ; for(const s of m.values()) if(s.size>=3)return true;return false
  }},
  { id: 'borboleta_social', name: 'Borboleta Social', points: 25, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=5) return true;return false }},
  { id: 'networker', name: 'Networker', points: 50, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=10) return true;return false }},
  { id: 'influencer', name: 'Influencer', points: 100, check: (_c,f) => { for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=20) return true;return false }},
  { id: 'super_conector', name: 'Super Conector(a)', points: 80, check: (_c,f) => { let ok=0; for(const d of[1,2,3]) if(new Set(f.filter(x=>x.day===d).map(x=>x.friend_id)).size>=5) ok++; return ok>=3 }},
  { id: 'celebridade', name: 'Celebridade', points: 150, check: (_c:EventInfo[],f:FriendInfo[]) => new Set(f.map(x=>x.friend_id)).size>=50 },
  { id: 'lenda_social', name: 'Lenda Social', points: 200, check: (_c:EventInfo[],f:FriendInfo[]) => new Set(f.map(x=>x.friend_id)).size>=100 },
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
  { id: 'completista', name: 'Completista', points: 150, check: (c,f,ci) => MISSIONS.filter(m=>m.check(c,f,ci)).length>=10 },
  { id: 'rex_supremo', name: 'REX Supremo', points: 300, check: (c,f,ci) => {
    const others = [...MISSIONS, { id:'completista',name:'',points:0,check:(c2:EventInfo[],f2:FriendInfo[],ci2?:Set<string>)=>MISSIONS.filter(m=>m.check(c2,f2,ci2)).length>=10 }]
    return others.every(m=>m.check(c,f,ci))
  }},
]

// ── Types ──
interface User { id: string; name: string; email: string; is_online: boolean; created_at: string }
interface Checkin { id: string; user_id: string; event_id: string; created_at: string }
interface FriendCheckin { id: string; user_id: string; friend_id: string; day: number; created_at: string }
interface Rating { id: string; user_id: string; stars: number; comment: string | null; created_at: string }

// ── Password Gate ──
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'sidare2026'

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', '1')
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
type Tab = 'dashboard' | 'users' | 'checkins' | 'ranking' | 'charts' | 'ratings'

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_auth') === '1')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [friendCheckins, setFriendCheckins] = useState<FriendCheckin[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [u, c, f, e, r] = await Promise.all([
      fetchAll<User>('users', 'created_at', false),
      fetchAll<Checkin>('checkins', 'created_at', false),
      fetchAll<FriendCheckin>('friend_checkins'),
      fetchAll<EventInfo>('events'),
      fetchAll<Rating>('ratings', 'created_at', false),
    ])
    setUsers(u)
    setCheckins(c)
    setFriendCheckins(f)
    setEvents(e)
    setRatings(r)
    setLoading(false)
  }, [])

  useEffect(() => { if (authed) loadData() }, [authed, loadData])

  // ── Ranking calculation ──
  const coordinatorIds = useMemo(() => {
    const ids = new Set<string>()
    for (const u of users) {
      if (COORDINATOR_EMAILS.includes(u.email)) ids.add(u.id)
    }
    return ids
  }, [users])

  const ranking = useMemo(() => {
    const eventMap = new Map(events.map(e => [e.id, e]))

    return users.map(u => {
      const userCheckins = checkins.filter(c => c.user_id === u.id && !CANCELLED_EVENTS.has(c.event_id))
      const userFriends = friendCheckins.filter(f => f.user_id === u.id)
      const eventInfos = userCheckins.map(c => eventMap.get(c.event_id)).filter(Boolean) as EventInfo[]
      const friendInfos = userFriends.map(f => ({ friend_id: f.friend_id, day: f.day }))
      const uniqueFriendDays = new Set(userFriends.map(f => `${f.friend_id}-${f.day}`)).size

      const basePoints = userCheckins.length * POINTS_PER_CHECKIN
      const friendPoints = uniqueFriendDays * POINTS_PER_CHECKIN
      const missionBonus = ALL_MISSIONS.reduce((sum, m) => sum + (m.check(eventInfos, friendInfos, coordinatorIds) ? m.points : 0), 0)
      const completedMissions = ALL_MISSIONS.filter(m => m.check(eventInfos, friendInfos, coordinatorIds)).length

      return {
        ...u,
        checkinCount: userCheckins.length,
        friendCount: new Set(userFriends.map(f => f.friend_id)).size,
        completedMissions,
        totalPoints: basePoints + friendPoints + missionBonus,
      }
    }).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [users, checkins, friendCheckins, events, coordinatorIds])

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
  const [userSort, setUserSort] = useState<{ col: 'name' | 'email' | 'created_at' | 'totalPoints'; dir: 'asc' | 'desc' }>({ col: 'totalPoints', dir: 'desc' })
  const [rankingFilter, setRankingFilter] = useState<'all' | 'presencial' | 'online'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const sortedUsers = useMemo(() => {
    const sorted = [...ranking]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (userSort.col) {
        case 'name': cmp = a.name.localeCompare(b.name, 'pt-BR'); break
        case 'email': cmp = a.email.localeCompare(b.email); break
        case 'created_at': cmp = a.created_at.localeCompare(b.created_at); break
        case 'totalPoints': cmp = a.totalPoints - b.totalPoints; break
      }
      return userSort.dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [ranking, userSort])

  const toggleUserSort = (col: typeof userSort.col) => {
    setUserSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'name' || col === 'email' ? 'asc' : 'desc' })
  }

  const sortIcon = (col: typeof userSort.col) => userSort.col === col ? (userSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const filteredRanking = useMemo(() => {
    if (rankingFilter === 'all') return ranking
    const wantOnline = rankingFilter === 'online'
    const userIsOnline = new Map(users.map(u => [u.id, u.is_online]))
    return ranking.filter(u => userIsOnline.get(u.id) === wantOnline)
  }, [ranking, rankingFilter, users])

  const selectedUserData = useMemo(() => {
    if (!selectedUserId) return null
    const user = users.find(u => u.id === selectedUserId)
    if (!user) return null
    const eventMap = new Map<string, EventInfo>(events.map((e: EventInfo) => [e.id, e]))
    const userCheckins = checkins.filter((c: Checkin) => c.user_id === selectedUserId && !CANCELLED_EVENTS.has(c.event_id))
    const userFriends = friendCheckins.filter((f: FriendCheckin) => f.user_id === selectedUserId)
    const eventInfos = userCheckins.map((c: Checkin) => eventMap.get(c.event_id)).filter(Boolean) as EventInfo[]
    const friendInfos = userFriends.map(f => ({ friend_id: f.friend_id, day: f.day }))

    // Friend names
    const userMap = new Map(users.map(u => [u.id, u.name]))
    const friendEntries = userFriends.map(f => ({
      name: userMap.get(f.friend_id) ?? f.friend_id.slice(0, 8),
      day: f.day,
      created_at: f.created_at,
    }))

    // Mission results
    const missionResults = ALL_MISSIONS.map(m => ({
      ...m,
      done: m.check(eventInfos, friendInfos, coordinatorIds),
    }))

    // Checkin events with details
    const checkinDetails = userCheckins.map(c => {
      const ev = eventMap.get(c.event_id)
      return {
        event_id: c.event_id,
        type: ev?.type ?? '?',
        room: ev?.room ?? null,
        day: ev?.day ?? 0,
        created_at: c.created_at,
      }
    }).sort((a, b) => b.created_at.localeCompare(a.created_at))

    const rankEntry = ranking.find(r => r.id === selectedUserId)

    return { user, checkinDetails, friendEntries, missionResults, totalPoints: rankEntry?.totalPoints ?? 0 }
  }, [selectedUserId, users, checkins, friendCheckins, events, ranking, coordinatorIds])

  const resetCheckins = async () => {
    if (!window.confirm('⚠️ Tem certeza? Isso vai apagar TODOS os checkins e encontros de amigos de todos os usuários.')) return
    if (!window.confirm('⚠️ Segunda confirmação: esta ação é IRREVERSÍVEL. Continuar?')) return
    setResetting(true)
    try {
      const { error } = await supabase.rpc('admin_reset_checkins')
      if (error) throw error
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
            {(['dashboard', 'users', 'checkins', 'ranking', 'charts'] as Tab[]).map(t => (
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
            {(['dashboard', 'users', 'checkins', 'ranking', 'charts'] as Tab[]).map(t => (
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
                      <th className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleUserSort('name')}>Nome{sortIcon('name')}</th>
                      <th className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleUserSort('email')}>Email{sortIcon('email')}</th>
                      <th className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-600" onClick={() => toggleUserSort('created_at')}>Cadastro{sortIcon('created_at')}</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-right cursor-pointer select-none hover:text-blue-600" onClick={() => toggleUserSort('totalPoints')}>Pontos{sortIcon('totalPoints')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedUsers.map(u => (
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
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(['all', 'presencial', 'online'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRankingFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-sm capitalize ${
                        rankingFilter === f ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 bg-white border'
                      }`}
                    >
                      {f === 'all' ? 'Todos' : f === 'presencial' ? 'Presencial' : 'Online'}
                    </button>
                  ))}
                </div>
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
                    {filteredRanking.map((u, i) => (
                      <tr key={u.id} className={`hover:bg-gray-50 ${i < 3 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-2 font-bold text-gray-400">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          <button onClick={() => setSelectedUserId(u.id)} className="text-blue-600 hover:underline text-left">
                            {u.name}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right">{u.checkinCount}</td>
                        <td className="px-4 py-2 text-right">{u.friendCount}</td>
                        <td className="px-4 py-2 text-right">{u.completedMissions}/{ALL_MISSIONS.length}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-600">{u.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Charts */}
            {tab === 'charts' && (
              <ChartsTab checkins={checkins} friendCheckins={friendCheckins} events={events} />
            )}

            {/* Ratings */}
            {tab === 'ratings' && (
              <RatingsTab ratings={ratings} users={users} />
            )}
          </>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUserData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={() => setSelectedUserId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mb-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedUserData.user.name}</h2>
                <p className="text-sm text-gray-500">{selectedUserData.user.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-600 font-bold text-lg">{selectedUserData.totalPoints} pts</span>
                <button onClick={() => setSelectedUserId(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
            </div>

            {/* Tabs inside modal */}
            <UserDetailTabs data={selectedUserData} />
          </div>
        </div>
      )}
    </div>
  )
}

type UserDetailTab = 'checkins' | 'amigos' | 'missoes'

interface UserDetailData {
  checkinDetails: { event_id: string; type: string; room: string | null; day: number; created_at: string }[]
  friendEntries: { name: string; day: number; created_at: string }[]
  missionResults: { id: string; name: string; points: number; done: boolean }[]
}

function UserDetailTabs({ data }: { data: UserDetailData }) {
  const [tab, setTab] = useState<UserDetailTab>('checkins')

  const dayLabel = (d: number) => ['', '23/mar', '24/mar', '25/mar'][d] ?? `D${d}`
  const typeEmoji: Record<string, string> = { oral: '🎤', poster: '🖼️', plenaria: '🎙️', stand: '🏛️', sirr: '💻', happyhour: '🍻', geolink: '🔗', dado: '🎲', agora: '🏛️', poco: '💡', gamee: '🎮', camalis: '🧪' }

  return (
    <div>
      <div className="flex border-b">
        {([['checkins', `📋 Checkins (${data.checkinDetails.length})`], ['amigos', `🤝 Amigos (${data.friendEntries.length})`], ['missoes', `🏆 Missões (${data.missionResults.filter(m => m.done).length}/${data.missionResults.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium ${tab === id ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {tab === 'checkins' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Evento</th>
                <th className="px-4 py-2 font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-2 font-medium text-gray-600">Dia</th>
                <th className="px-4 py-2 font-medium text-gray-600">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.checkinDetails.map(c => (
                <tr key={c.event_id} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5 font-mono text-xs">{c.event_id}</td>
                  <td className="px-4 py-1.5">{typeEmoji[c.type] ?? '📌'} {c.type}{c.room ? ` · ${c.room}` : ''}</td>
                  <td className="px-4 py-1.5 text-gray-500">{dayLabel(c.day)}</td>
                  <td className="px-4 py-1.5 text-gray-500">{new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {data.checkinDetails.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Nenhum checkin</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'amigos' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-600">Amigo</th>
                <th className="px-4 py-2 font-medium text-gray-600">Dia</th>
                <th className="px-4 py-2 font-medium text-gray-600">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.friendEntries.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5 font-medium">{f.name}</td>
                  <td className="px-4 py-1.5 text-gray-500">{dayLabel(f.day)}</td>
                  <td className="px-4 py-1.5 text-gray-500">{new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {data.friendEntries.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Nenhum amigo</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'missoes' && (
          <div className="divide-y">
            {data.missionResults.map(m => (
              <div key={m.id} className={`px-4 py-2.5 flex items-center justify-between ${m.done ? '' : 'opacity-40'}`}>
                <div className="flex items-center gap-2">
                  <span>{m.done ? '✅' : '⬜'}</span>
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <span className={`text-sm font-semibold ${m.done ? 'text-green-600' : 'text-gray-400'}`}>{m.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChartsTab({ checkins, friendCheckins, events }: { checkins: Checkin[]; friendCheckins: FriendCheckin[]; events: EventInfo[] }) {
  const eventMap = useMemo(() => new Map<string, EventInfo>(events.map(e => [e.id, e])), [events])

  const data = useMemo(() => {
    return [1, 2, 3].map(day => {
      const dayCheckins = checkins.filter(c => {
        const ev = eventMap.get(c.event_id)
        return ev && ev.day === day && !CANCELLED_EVENTS.has(c.event_id)
      })
      const orais = dayCheckins.filter(c => eventMap.get(c.event_id)?.type === 'oral').length
      const posters = dayCheckins.filter(c => eventMap.get(c.event_id)?.type === 'poster').length
      const outros = dayCheckins.length - orais - posters
      const amigos = friendCheckins.filter(f => f.day === day).length
      return { day, orais, posters, outros, amigos, totalEventos: dayCheckins.length }
    })
  }, [checkins, friendCheckins, eventMap])

  const maxVal = Math.max(1, ...data.flatMap(d => [d.orais, d.posters, d.outros, d.amigos]))

  const dayLabel = (d: number) => `Dia ${d} (${22 + d}/mar)`

  const categories = [
    { key: 'orais' as const, label: 'Orais', color: 'bg-blue-500', textColor: 'text-blue-700' },
    { key: 'posters' as const, label: 'Posters', color: 'bg-amber-500', textColor: 'text-amber-700' },
    { key: 'outros' as const, label: 'Outros eventos', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { key: 'amigos' as const, label: 'Amigos', color: 'bg-purple-500', textColor: 'text-purple-700' },
  ]

  return (
    <div className="space-y-8">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {categories.map(cat => (
          <div key={cat.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${cat.color}`} />
            <span className="text-sm text-gray-600">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Per-day charts */}
      {data.map(d => (
        <div key={d.day} className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-1">{dayLabel(d.day)}</h3>
          <p className="text-xs text-gray-400 mb-4">{d.totalEventos} checkins em eventos · {d.amigos} checkins de amigos</p>
          <div className="space-y-3">
            {categories.map(cat => {
              const val = d[cat.key]
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 text-right shrink-0">{cat.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${cat.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                      style={{ width: `${Math.max(pct, val > 0 ? 3 : 0)}%` }}
                    >
                      {pct > 8 && <span className="text-xs font-bold text-white">{val}</span>}
                    </div>
                  </div>
                  {pct <= 8 && <span className={`text-xs font-bold ${cat.textColor} w-8`}>{val}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Stacked summary */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Visão Geral — Checkins por Dia</h3>
        <div className="space-y-4">
          {data.map(d => {
            const total = d.orais + d.posters + d.outros + d.amigos
            if (total === 0) return (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-24 text-right shrink-0">{dayLabel(d.day)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-8">
                  <span className="text-xs text-gray-400 flex items-center h-full pl-3">Sem dados</span>
                </div>
              </div>
            )
            return (
              <div key={d.day}>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-24 text-right shrink-0">{dayLabel(d.day)}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden flex">
                    {categories.map(cat => {
                      const val = d[cat.key]
                      const pct = (val / total) * 100
                      if (val === 0) return null
                      return (
                        <div
                          key={cat.key}
                          className={`${cat.color} h-full flex items-center justify-center transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                          title={`${cat.label}: ${val}`}
                        >
                          {pct > 10 && <span className="text-xs font-bold text-white">{val}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-sm font-bold text-gray-600 w-10 text-right">{total}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RatingsTab({ ratings, users }: { ratings: Rating[]; users: User[] }) {
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users])

  const stats = useMemo(() => {
    if (ratings.length === 0) return null
    const total = ratings.length
    const avg = ratings.reduce((s, r) => s + r.stars, 0) / total
    const dist = [0, 0, 0, 0, 0]
    for (const r of ratings) dist[r.stars - 1]++
    const withComment = ratings.filter(r => r.comment && r.comment.trim().length > 0)
    return { total, avg, dist, withComment }
  }, [ratings])

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">⭐</p>
        <p>Nenhuma avaliação recebida ainda.</p>
      </div>
    )
  }

  const maxDist = Math.max(1, ...stats.dist)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Avaliações</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Média</p>
          <p className="text-2xl font-bold text-amber-600">{stats.avg.toFixed(1)} ⭐</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Com comentário</p>
          <p className="text-2xl font-bold">{stats.withComment.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Taxa de resposta</p>
          <p className="text-2xl font-bold">{((stats.total / users.length) * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Star distribution */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Distribuição das Estrelas</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.dist[star - 1]
            const pct = (count / maxDist) * 100
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12 text-right shrink-0">{star} ⭐</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                  >
                    {pct > 10 && <span className="text-xs font-bold text-white">{count}</span>}
                  </div>
                </div>
                {pct <= 10 && <span className="text-xs font-bold text-amber-700 w-8">{count}</span>}
                <span className="text-xs text-gray-400 w-10 text-right">
                  {((count / stats.total) * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Comments */}
      {stats.withComment.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Comentários ({stats.withComment.length})</h3>
          <div className="space-y-3">
            {stats.withComment.map(r => {
              const user = userMap.get(r.user_id)
              return (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{user?.name ?? 'Anônimo'}</span>
                      <span className="text-xs text-amber-600">{'⭐'.repeat(r.stars)}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{r.comment}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
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
