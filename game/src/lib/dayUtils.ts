const EVENT_DATES: Record<number, string> = {
  1: '2026-03-23',
  2: '2026-03-24',
  3: '2026-03-25',
}

export function getCurrentDay(): number {
  const today = new Date().toISOString().slice(0, 10)
  for (const [day, date] of Object.entries(EVENT_DATES)) {
    if (today === date) return Number(day)
  }
  // Outside event dates: default to day 1 for testing
  return 1
}

export function getDayLabel(day: number): string {
  const labels: Record<number, string> = {
    1: '23/mar (seg)',
    2: '24/mar (ter)',
    3: '25/mar (qua)',
  }
  return labels[day] ?? `Dia ${day}`
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    oral: 'Apresentação Oral',
    poster: 'Poster',
    plenaria: 'Plenária',
  }
  return labels[type] ?? type
}

export function getTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    oral: '🎤',
    poster: '🖼️',
    plenaria: '🎙️',
  }
  return emojis[type] ?? '📌'
}

export function getTrackLabel(trackCode: string | null): string | null {
  if (!trackCode) return null
  const labels: Record<string, string> = {
    T1: 'Trilha 1 — IA',
    T2: 'Trilha 2 — Dados',
    T3: 'Trilha 3 — Gestão',
  }
  return labels[trackCode] ?? trackCode
}
