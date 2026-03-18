import { useMemo } from 'react'
import { useAuth } from './auth'
import { MISSIONS, POINTS_PER_CHECKIN, calculateTotalPoints, type Mission } from './missions'
import type { EventRow } from './supabase'

export interface MissionResult extends Mission {
  result: { done: boolean; progress: number; total: number }
}

export interface FriendInfo {
  friend_id: string
  day: number
}

export function useGameData() {
  const { checkins, friendCheckins, events } = useAuth()

  const eventInfoMap = useMemo(() =>
    new Map(events.map(e => [e.id, e])),
    [events]
  )

  const checkinEvents = useMemo(() =>
    checkins.map(c => eventInfoMap.get(c.event_id)).filter(Boolean) as EventRow[],
    [checkins, eventInfoMap]
  )

  const friendInfos = useMemo((): FriendInfo[] =>
    friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day })),
    [friendCheckins]
  )

  const totalPoints = useMemo(() =>
    calculateTotalPoints(checkins, friendCheckins, checkinEvents as any, friendInfos),
    [checkins, friendCheckins, checkinEvents, friendInfos]
  )

  const missionResults = useMemo((): MissionResult[] =>
    MISSIONS.map(m => ({ ...m, result: m.check(checkinEvents as any, friendInfos) })),
    [checkinEvents, friendInfos]
  )

  const completedMissions = useMemo(() =>
    missionResults.filter(m => m.result.done),
    [missionResults]
  )

  const uniqueFriends = useMemo(() =>
    new Set(friendCheckins.map(f => f.friend_id)).size,
    [friendCheckins]
  )

  // Next mission to complete (closest to done, not yet done)
  const nextMission = useMemo(() => {
    const pending = missionResults.filter(m => !m.result.done && m.result.total > 0)
    if (pending.length === 0) return null
    // Sort by completion ratio descending (closest to done first)
    return pending.sort((a, b) => {
      const ratioA = a.result.progress / a.result.total
      const ratioB = b.result.progress / b.result.total
      return ratioB - ratioA
    })[0]!
  }, [missionResults])

  return {
    eventInfoMap,
    checkinEvents,
    friendInfos,
    totalPoints,
    missionResults,
    completedMissions,
    uniqueFriends,
    nextMission,
  }
}
