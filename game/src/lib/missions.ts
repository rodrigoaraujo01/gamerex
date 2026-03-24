export const POINTS_PER_CHECKIN = 10

// ─── Subtrilha reference ───
// T1-1: Aplicações de IA  |  T1-2: Chats e Agentes
// T1-3: Demos IA           |  T1-4: Scientific ML
// T2-1: Governança         |  T2-2: Arquitetura
// T2-3: Qualidade          |  T3-1: Gestão Mudança
// T3-2: Gestão Conhecimento|  T3-3: IA Responsável
// T3-4: HPC/Pipelines      |  T3-5: MLOps

interface EventInfo {
  id: string
  type: 'oral' | 'poster' | 'plenaria' | 'stand' | 'sirr' | 'happyhour' | 'geolink' | 'dado' | 'agora' | 'poco' | 'gamee' | 'camalis'
  day: number
  room: string | null
  track_code: string | null
  subtrilha: string | null
}

interface FriendInfo {
  friend_id: string
  day: number
}

export interface MissionContext {
  coordinatorIds?: Set<string>
}

export interface Mission {
  id: string
  name: string
  description: string
  category: 'oral' | 'poster' | 'plenaria' | 'stand' | 'networking' | 'trilha' | 'special'
  points: number
  check: (checkins: EventInfo[], friends: FriendInfo[], ctx?: MissionContext) => { done: boolean; progress: number; total: number }
}

export const COORDINATOR_EMAILS = [
  'samya.pinheiro@petrobras.com.br',
  'danyella.carvalho@petrobras.com.br',
  'carolcaetano@petrobras.com.br',
]

const COORDINATOR_NAMES: Record<string, string> = {
  'samya.pinheiro@petrobras.com.br': 'Samya',
  'danyella.carvalho@petrobras.com.br': 'Danyella',
  'carolcaetano@petrobras.com.br': 'Caroline',
}

const ROOMS = ['Auditório', 'Sala .DAT', 'Sala .LAS', 'Sala .SEGY']
const T1_SUBS = ['T1-1', 'T1-2', 'T1-3', 'T1-4']
const T2_SUBS = ['T2-1', 'T2-2', 'T2-3']
const T3_SUBS = ['T3-1', 'T3-2', 'T3-3', 'T3-4', 'T3-5']

// Count posters per day in our data: 20 each
const POSTERS_PER_DAY = 20

function orals(c: EventInfo[]) { return c.filter(e => e.type === 'oral') }
function posters(c: EventInfo[]) { return c.filter(e => e.type === 'poster') }
function plenarias(c: EventInfo[]) { return c.filter(e => e.type === 'plenaria') }
function stands(c: EventInfo[]) { return c.filter(e => e.type === 'stand') }
function sirrs(c: EventInfo[]) { return c.filter(e => e.type === 'sirr') }
function happyhours(c: EventInfo[]) { return c.filter(e => e.type === 'happyhour') }
function geolinks(c: EventInfo[]) { return c.filter(e => e.type === 'geolink') }
function dados(c: EventInfo[]) { return c.filter(e => e.type === 'dado') }
function agoras(c: EventInfo[]) { return c.filter(e => e.type === 'agora') }
function pocos(c: EventInfo[]) { return c.filter(e => e.type === 'poco') }
function gamees(c: EventInfo[]) { return c.filter(e => e.type === 'gamee') }
function camalises(c: EventInfo[]) { return c.filter(e => e.type === 'camalis') }

function uniqueDays(items: { day: number }[]): Set<number> {
  return new Set(items.map(i => i.day))
}

export const MISSIONS: Mission[] = [
  // ─── Orais ───
  {
    id: 'turista_salas',
    name: 'Turista das Salas',
    description: 'Ver 1 oral em cada sala em 1 dia',
    category: 'oral',
    points: 50,
    check: (c) => {
      for (const day of [1, 2, 3]) {
        const dayOrals = orals(c).filter(e => e.day === day)
        const rooms = new Set(dayOrals.map(e => e.room).filter(Boolean))
        if (rooms.size >= 4) return { done: true, progress: 4, total: 4 }
      }
      // Show best day progress
      let best = 0
      for (const day of [1, 2, 3]) {
        const rooms = new Set(orals(c).filter(e => e.day === day).map(e => e.room).filter(Boolean))
        best = Math.max(best, rooms.size)
      }
      return { done: false, progress: Math.min(best, 4), total: 4 }
    },
  },
  {
    id: 'maratonista',
    name: 'Maratonista',
    description: 'Assistir todos os orais de 1 sala em 1 dia',
    category: 'oral',
    points: 40,
    check: (c) => {
      // Orals per room per day (Sala .LAS has no Day 3 orals)
      const defaultTargets: Record<number, number> = { 1: 4, 2: 5, 3: 2 }
      const counts: Record<string, Record<number, number>> = {}
      const targets: Record<string, Record<number, number>> = {}
      for (const room of ROOMS) {
        counts[room] = { 1: 0, 2: 0, 3: 0 }
        targets[room] = room === 'Sala .LAS' ? { 1: 4, 2: 5, 3: 0 } : { ...defaultTargets }
      }
      for (const e of orals(c)) {
        if (e.room && counts[e.room]) counts[e.room]![e.day]!++
      }
      for (const room of ROOMS) {
        for (const day of [1, 2, 3]) {
          const target = targets[room]![day]!
          if (target > 0 && counts[room]![day]! >= target) {
            return { done: true, progress: target, total: target }
          }
        }
      }
      // Best progress ratio
      let bestRatio = 0
      let bestProg = 0
      let bestTotal = 1
      for (const room of ROOMS) {
        for (const day of [1, 2, 3]) {
          const target = targets[room]![day]!
          if (target === 0) continue
          const got = counts[room]![day]!
          const ratio = got / target
          if (ratio > bestRatio) { bestRatio = ratio; bestProg = got; bestTotal = target }
        }
      }
      return { done: false, progress: bestProg, total: bestTotal }
    },
  },
  {
    id: 'fiel_orais',
    name: 'Fiel às Orais',
    description: 'Assistir pelo menos 1 oral em cada dia do evento',
    category: 'oral',
    points: 30,
    check: (c) => {
      const days = uniqueDays(orals(c))
      return { done: days.size >= 3, progress: days.size, total: 3 }
    },
  },

  // ─── Posters ───
  {
    id: 'curioso',
    name: 'Curioso(a)',
    description: 'Ver pelo menos 1 poster em cada dia',
    category: 'poster',
    points: 30,
    check: (c) => {
      const days = uniqueDays(posters(c))
      return { done: days.size >= 3, progress: days.size, total: 3 }
    },
  },
  {
    id: 'explorador',
    name: 'Explorador(a)',
    description: 'Ver 5 posters em 1 dia',
    category: 'poster',
    points: 25,
    check: (c) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const count = posters(c).filter(e => e.day === day).length
        best = Math.max(best, count)
      }
      return { done: best >= 5, progress: Math.min(best, 5), total: 5 }
    },
  },
  {
    id: 'detetive_posters',
    name: 'Detetive de Posters',
    description: 'Ver 10 posters em 1 dia',
    category: 'poster',
    points: 50,
    check: (c) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const count = posters(c).filter(e => e.day === day).length
        best = Math.max(best, count)
      }
      return { done: best >= 10, progress: Math.min(best, 10), total: 10 }
    },
  },
  {
    id: 'mestre_posters',
    name: 'Mestre dos Posters',
    description: `Ver todos os ${POSTERS_PER_DAY} posters de 1 dia`,
    category: 'poster',
    points: 100,
    check: (c) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const count = posters(c).filter(e => e.day === day).length
        best = Math.max(best, count)
      }
      return { done: best >= POSTERS_PER_DAY, progress: Math.min(best, POSTERS_PER_DAY), total: POSTERS_PER_DAY }
    },
  },

  {
    id: 'fiel_posters_d1',
    name: 'Fiel aos Posters — Dia 1',
    description: 'Ver todos os 20 posters do dia 1',
    category: 'poster',
    points: 50,
    check: (c) => {
      const count = posters(c).filter(e => e.day === 1).length
      return { done: count >= POSTERS_PER_DAY, progress: Math.min(count, POSTERS_PER_DAY), total: POSTERS_PER_DAY }
    },
  },
  {
    id: 'fiel_posters_d2',
    name: 'Fiel aos Posters — Dia 2',
    description: 'Ver todos os 20 posters do dia 2',
    category: 'poster',
    points: 50,
    check: (c) => {
      const count = posters(c).filter(e => e.day === 2).length
      return { done: count >= POSTERS_PER_DAY, progress: Math.min(count, POSTERS_PER_DAY), total: POSTERS_PER_DAY }
    },
  },
  {
    id: 'fiel_posters_d3',
    name: 'Fiel aos Posters — Dia 3',
    description: 'Ver todos os 20 posters do dia 3',
    category: 'poster',
    points: 50,
    check: (c) => {
      const count = posters(c).filter(e => e.day === 3).length
      return { done: count >= POSTERS_PER_DAY, progress: Math.min(count, POSTERS_PER_DAY), total: POSTERS_PER_DAY }
    },
  },
  {
    id: 'colecionador_posters',
    name: 'Colecionador(a) de Posters',
    description: 'Ver todos os 60 posters do SIDARE',
    category: 'poster',
    points: 200,
    check: (c) => {
      const count = posters(c).length
      return { done: count >= 60, progress: Math.min(count, 60), total: 60 }
    },
  },

  // ─── Plenárias ───
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Assistir às plenárias dos 3 dias',
    category: 'plenaria',
    points: 50,
    check: (c) => {
      const days = uniqueDays(plenarias(c))
      return { done: days.size >= 3, progress: days.size, total: 3 }
    },
  },

  // ─── Mini-Expo (Stands) ───
  {
    id: 'visitante_expo',
    name: 'Visitante da Expo',
    description: 'Visitar pelo menos 1 stand da Mini-Expo',
    category: 'stand',
    points: 20,
    check: (c) => {
      const count = stands(c).length
      return { done: count >= 1, progress: Math.min(count, 1), total: 1 }
    },
  },
  {
    id: 'tour_completo',
    name: 'Tour Completo',
    description: 'Visitar os 3 stands em 1 dia',
    category: 'stand',
    points: 40,
    check: (c) => {
      for (const day of [1, 2, 3]) {
        const dayStands = stands(c).filter(e => e.day === day)
        const rooms = new Set(dayStands.map(e => e.room))
        if (rooms.size >= 3) return { done: true, progress: 3, total: 3 }
      }
      let best = 0
      for (const day of [1, 2, 3]) {
        const rooms = new Set(stands(c).filter(e => e.day === day).map(e => e.room))
        best = Math.max(best, rooms.size)
      }
      return { done: false, progress: Math.min(best, 3), total: 3 }
    },
  },
  {
    id: 'fiel_expo',
    name: 'Fiel da Expo',
    description: 'Visitar a Mini-Expo em todos os 3 dias',
    category: 'stand',
    points: 40,
    check: (c) => {
      const days = uniqueDays(stands(c))
      return { done: days.size >= 3, progress: days.size, total: 3 }
    },
  },
  {
    id: 'expert_expo',
    name: 'Expert da Expo',
    description: 'Visitar todos os 9 stands (3 por dia)',
    category: 'stand',
    points: 80,
    check: (c) => {
      const count = stands(c).length
      return { done: count >= 9, progress: Math.min(count, 9), total: 9 }
    },
  },

  // ─── Networking ───
  {
    id: 'primeiro_contato',
    name: 'Primeiro Contato',
    description: 'Fazer checkin com pelo menos 1 amigo em cada dia',
    category: 'networking',
    points: 30,
    check: (_c, f) => {
      const days = uniqueDays(f)
      return { done: days.size >= 3, progress: days.size, total: 3 }
    },
  },
  {
    id: 'bff',
    name: 'BFF',
    description: 'Encontrar o mesmo amigo todos os 3 dias',
    category: 'networking',
    points: 50,
    check: (_c, f) => {
      const friendDays = new Map<string, Set<number>>()
      for (const fc of f) {
        if (!friendDays.has(fc.friend_id)) friendDays.set(fc.friend_id, new Set())
        friendDays.get(fc.friend_id)!.add(fc.day)
      }
      let bestCount = 0
      for (const days of friendDays.values()) {
        bestCount = Math.max(bestCount, days.size)
        if (days.size >= 3) return { done: true, progress: 3, total: 3 }
      }
      return { done: false, progress: bestCount, total: 3 }
    },
  },
  {
    id: 'borboleta_social',
    name: 'Borboleta Social',
    description: 'Encontrar 5 amigos em 1 dia',
    category: 'networking',
    points: 25,
    check: (_c, f) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const unique = new Set(f.filter(fc => fc.day === day).map(fc => fc.friend_id))
        best = Math.max(best, unique.size)
      }
      return { done: best >= 5, progress: Math.min(best, 5), total: 5 }
    },
  },
  {
    id: 'networker',
    name: 'Networker',
    description: 'Encontrar 10 amigos em 1 dia',
    category: 'networking',
    points: 50,
    check: (_c, f) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const unique = new Set(f.filter(fc => fc.day === day).map(fc => fc.friend_id))
        best = Math.max(best, unique.size)
      }
      return { done: best >= 10, progress: Math.min(best, 10), total: 10 }
    },
  },
  {
    id: 'influencer',
    name: 'Influencer',
    description: 'Encontrar 20 amigos em 1 dia',
    category: 'networking',
    points: 100,
    check: (_c, f) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const unique = new Set(f.filter(fc => fc.day === day).map(fc => fc.friend_id))
        best = Math.max(best, unique.size)
      }
      return { done: best >= 20, progress: Math.min(best, 20), total: 20 }
    },
  },
  {
    id: 'super_conector',
    name: 'Super Conector(a)',
    description: 'Encontrar 5 amigos todos os dias',
    category: 'networking',
    points: 80,
    check: (_c, f) => {
      let daysOk = 0
      for (const day of [1, 2, 3]) {
        const unique = new Set(f.filter(fc => fc.day === day).map(fc => fc.friend_id))
        if (unique.size >= 5) daysOk++
      }
      return { done: daysOk >= 3, progress: daysOk, total: 3 }
    },
  },

  {
    id: 'celebridade',
    name: 'Celebridade',
    description: 'Encontrar 50 amigos no total',
    category: 'networking',
    points: 150,
    check: (_c, f) => {
      const total = new Set(f.map(fc => fc.friend_id)).size
      return { done: total >= 50, progress: Math.min(total, 50), total: 50 }
    },
  },
  {
    id: 'lenda_social',
    name: 'Lenda Social',
    description: 'Encontrar 100 amigos no total',
    category: 'networking',
    points: 200,
    check: (_c, f) => {
      const total = new Set(f.map(fc => fc.friend_id)).size
      return { done: total >= 100, progress: Math.min(total, 100), total: 100 }
    },
  },

  // ─── Trilhas ───
  {
    id: 'ecletico',
    name: 'Eclético(a)',
    description: 'Checkin em 1 trabalho da T1, 1 da T2 e 1 da T3',
    category: 'trilha',
    points: 30,
    check: (c) => {
      const tracks = new Set(c.filter(e => e.track_code).map(e => e.track_code))
      const count = ['T1', 'T2', 'T3'].filter(t => tracks.has(t)).length
      return { done: count >= 3, progress: count, total: 3 }
    },
  },
  {
    id: 'guru_ia',
    name: 'Guru de IA',
    description: 'Checkin em 1 trabalho de cada subtrilha da T1 (4)',
    category: 'trilha',
    points: 60,
    check: (c) => {
      const subs = new Set(c.filter(e => e.subtrilha?.startsWith('T1')).map(e => e.subtrilha))
      const count = T1_SUBS.filter(s => subs.has(s)).length
      return { done: count >= T1_SUBS.length, progress: count, total: T1_SUBS.length }
    },
  },
  {
    id: 'mestre_dados',
    name: 'Mestre dos Dados',
    description: 'Checkin em 1 trabalho de cada subtrilha da T2 (3)',
    category: 'trilha',
    points: 60,
    check: (c) => {
      const subs = new Set(c.filter(e => e.subtrilha?.startsWith('T2')).map(e => e.subtrilha))
      const count = T2_SUBS.filter(s => subs.has(s)).length
      return { done: count >= T2_SUBS.length, progress: count, total: T2_SUBS.length }
    },
  },
  {
    id: 'transversal',
    name: 'Transversal',
    description: 'Checkin em 1 trabalho de cada subtrilha da T3 (5)',
    category: 'trilha',
    points: 60,
    check: (c) => {
      const subs = new Set(c.filter(e => e.subtrilha?.startsWith('T3')).map(e => e.subtrilha))
      const count = T3_SUBS.filter(s => subs.has(s)).length
      return { done: count >= T3_SUBS.length, progress: count, total: T3_SUBS.length }
    },
  },

  // ─── SIRR Web ───
  {
    id: 'sirr_expert',
    name: 'SIRR Expert',
    description: 'Faça as atividades de descoberta do SIRR Web',
    category: 'stand',
    points: 100,
    check: (c) => {
      const count = sirrs(c).length
      return { done: count >= 4, progress: Math.min(count, 4), total: 4 }
    },
  },

  // ─── GeoLink ───
  {
    id: 'geolinker',
    name: 'GeoLinker',
    description: 'Descubra como publicar um protótipo no GeoLink',
    category: 'stand',
    points: 100,
    check: (c) => {
      const gl = geolinks(c)
      const ids = new Set(gl.map(e => e.id))
      const count = ['GL1', 'GL2', 'GL3'].filter(id => ids.has(id)).length
      return { done: count >= 3, progress: count, total: 3 }
    },
  },
  {
    id: 'explorador_geolink',
    name: 'Explorador de Soluções do GeoLink',
    description: 'Explore as soluções publicadas no GeoLink',
    category: 'stand',
    points: 100,
    check: (c) => {
      const gl = geolinks(c)
      const ids = new Set(gl.map(e => e.id))
      const count = ['GL4', 'GL5', 'GL6', 'GL7'].filter(id => ids.has(id)).length
      return { done: count >= 4, progress: count, total: 4 }
    },
  },

  // ─── Caçando o Dado ───
  {
    id: 'cacando_dado',
    name: 'Caçando o Dado',
    description: 'Use as aplicações e encontre o dado de rocha e fluido',
    category: 'stand',
    points: 100,
    check: (c) => {
      const d = dados(c)
      const ids = new Set(d.map(e => e.id))
      const count = ['CD1', 'CD2', 'CD3'].filter(id => ids.has(id)).length
      return { done: count >= 3, progress: count, total: 3 }
    },
  },

  // ─── Poço das Ideias ───
  {
    id: 'poco_ideias',
    name: 'Poço das ideias',
    description: 'Adicionar uma ideia na Jornada do Dado',
    category: 'stand',
    points: 100,
    check: (c) => {
      const standIds = new Set(c.filter(e => e.type === 'stand').map(e => e.id))
      const pocoIds = new Set(pocos(c).map(e => e.id))
      const count = (standIds.has('STAND-2-D1') ? 1 : 0) + (pocoIds.has('POCO1') ? 1 : 0)
      return { done: count >= 2, progress: count, total: 2 }
    },
  },

  // ─── Ágora ───
  {
    id: 'fui_em_atenas',
    name: 'Fui em Atenas e voltei',
    description: 'Visitar o stand do Ágora e participar da ativação',
    category: 'stand',
    points: 100,
    check: (c) => {
      const standIds = new Set(c.filter(e => e.type === 'stand').map(e => e.id))
      const agoraIds = new Set(agoras(c).map(e => e.id))
      const count = (standIds.has('STAND-1-D3') ? 1 : 0) + (agoraIds.has('AG1') ? 1 : 0) + (agoraIds.has('AG2') ? 1 : 0)
      return { done: count >= 3, progress: count, total: 3 }
    },
  },

  // ─── GAMEE ───
  {
    id: 'quiz_gamee',
    name: 'Quiz GAMEE',
    description: 'Completar o quiz do GAMEE',
    category: 'stand',
    points: 100,
    check: (c) => {
      const standIds = new Set(c.filter(e => e.type === 'stand').map(e => e.id))
      const gameeIds = new Set(gamees(c).map(e => e.id))
      const count = (standIds.has('STAND-2-D2') ? 1 : 0) + (gameeIds.has('GAMEE1') ? 1 : 0)
      return { done: count >= 2, progress: count, total: 2 }
    },
  },

  // ─── CAMÁLIS ───
  {
    id: 'quiz_camalis',
    name: 'Quiz CAMÁLIS',
    description: 'Completar o quiz do CAMÁLIS',
    category: 'stand',
    points: 100,
    check: (c) => {
      const standIds = new Set(c.filter(e => e.type === 'stand').map(e => e.id))
      const camalisIds = new Set(camalises(c).map(e => e.id))
      const count = (standIds.has('STAND-2-D2') ? 1 : 0) + (camalisIds.has('CAMALIS1') ? 1 : 0)
      return { done: count >= 2, progress: count, total: 2 }
    },
  },

  // ─── Happy Hour ───
  {
    id: 'happy_hour',
    name: 'Do Dado ao Barril',
    description: 'Participar do Happy Hour SIDARE',
    category: 'special',
    points: 50,
    check: (c) => {
      const count = happyhours(c).length
      return { done: count >= 1, progress: Math.min(count, 1), total: 1 }
    },
  },

  // ─── Desafios Especiais ───
  {
    id: 'lideres_supremas',
    name: 'Líderes Supremas',
    description: 'Encontrar as 3 coordenadoras gerais do SIDARE 2026',
    category: 'special',
    points: 100,
    check: (_c, f, ctx) => {
      if (!ctx?.coordinatorIds || ctx.coordinatorIds.size === 0) return { done: false, progress: 0, total: 3 }
      const met = new Set<string>()
      for (const fc of f) {
        if (ctx.coordinatorIds.has(fc.friend_id)) met.add(fc.friend_id)
      }
      const count = met.size
      return { done: count >= 3, progress: Math.min(count, 3), total: 3 }
    },
  },
  {
    id: 'combo_dia',
    name: 'Combo do Dia',
    description: 'Fazer checkin em oral + poster + plenária no mesmo dia',
    category: 'special',
    points: 40,
    check: (c) => {
      for (const day of [1, 2, 3]) {
        const dayCheckins = c.filter(e => e.day === day)
        const types = new Set(dayCheckins.map(e => e.type))
        if (types.has('oral') && types.has('poster') && types.has('plenaria')) {
          return { done: true, progress: 3, total: 3 }
        }
      }
      // Best day
      let best = 0
      for (const day of [1, 2, 3]) {
        const dayCheckins = c.filter(e => e.day === day)
        const types = new Set(dayCheckins.map(e => e.type))
        const count = (['oral', 'poster', 'plenaria'] as const).filter(t => types.has(t)).length
        best = Math.max(best, count)
      }
      return { done: false, progress: best, total: 3 }
    },
  },
  {
    id: 'presenca_vip',
    name: 'Presença VIP',
    description: 'Fazer pelo menos 1 checkin (qualquer tipo) em cada dia',
    category: 'special',
    points: 20,
    check: (c, f) => {
      const allDays = new Set([...c.map(e => e.day), ...f.map(fc => fc.day)])
      const count = [1, 2, 3].filter(d => allDays.has(d)).length
      return { done: count >= 3, progress: count, total: 3 }
    },
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    description: 'Fazer 10 checkins em 1 dia',
    category: 'special',
    points: 40,
    check: (c, f) => {
      let best = 0
      for (const day of [1, 2, 3]) {
        const eventCount = c.filter(e => e.day === day).length
        const friendCount = new Set(f.filter(fc => fc.day === day).map(fc => fc.friend_id)).size
        best = Math.max(best, eventCount + friendCount)
      }
      return { done: best >= 10, progress: Math.min(best, 10), total: 10 }
    },
  },
  {
    id: 'completista',
    name: 'Completista',
    description: 'Completar pelo menos 10 missões',
    category: 'special',
    points: 150,
    check: (c, f, ctx) => {
      const completed = MISSIONS.filter(
        m => m.id !== 'completista' && m.id !== 'rex_supremo' && m.check(c, f, ctx).done
      ).length
      return { done: completed >= 10, progress: Math.min(completed, 10), total: 10 }
    },
  },
  {
    id: 'rex_supremo',
    name: 'REX Supremo',
    description: 'Completar todas as outras missões',
    category: 'special',
    points: 300,
    check: (c, f, ctx) => {
      const others = MISSIONS.filter(m => m.id !== 'rex_supremo')
      const completed = others.filter(m => m.check(c, f, ctx).done).length
      return { done: completed >= others.length, progress: completed, total: others.length }
    },
  },
]

// ─── Player Levels ───
export const LEVELS = [
  { minPoints: 0, title: 'Novato', emoji: '🥚' },
  { minPoints: 50, title: 'Iniciante', emoji: '🦎' },
  { minPoints: 150, title: 'Explorador', emoji: '🦕' },
  { minPoints: 300, title: 'Veterano', emoji: '🦖' },
  { minPoints: 500, title: 'Lenda', emoji: '⭐' },
  { minPoints: 800, title: 'Rex Supremo', emoji: '👑' },
]

export function getPlayerLevel(points: number) {
  let level = LEVELS[0]!
  for (const l of LEVELS) {
    if (points >= l.minPoints) level = l
    else break
  }
  const idx = LEVELS.indexOf(level)
  const nextLevel = idx < LEVELS.length - 1 ? LEVELS[idx + 1]! : null
  return { ...level, nextLevel }
}

export const CATEGORY_LABELS: Record<string, string> = {
  oral: '🎤 Apresentações Orais',
  poster: '🖼️ Posters',
  plenaria: '🎙️ Plenárias',
  stand: '🏛️ Mini-Expo',
  networking: '🤝 Networking',
  trilha: '🧩 Trilhas',
  special: '🏆 Desafios Especiais',
}

export const CATEGORY_ORDER = ['oral', 'poster', 'plenaria', 'stand', 'networking', 'trilha', 'special']

export function calculateTotalPoints(
  checkins: { event_id: string }[],
  friendCheckins: { friend_id: string; day: number }[],
  events: EventInfo[],
  allFriends: FriendInfo[],
  ctx?: MissionContext
): number {
  const basePoints = checkins.length * POINTS_PER_CHECKIN
  const friendPoints = new Set(friendCheckins.map(f => `${f.friend_id}-${f.day}`)).size * POINTS_PER_CHECKIN
  const missionBonus = MISSIONS.reduce((sum, m) => {
    return sum + (m.check(events, allFriends, ctx).done ? m.points : 0)
  }, 0)
  return basePoints + friendPoints + missionBonus
}
