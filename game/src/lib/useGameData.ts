import { useMemo, useState, useEffect } from 'react'
import { useAuth } from './auth'
import { MISSIONS, POINTS_PER_CHECKIN, calculateTotalPoints, COORDINATOR_EMAILS, type Mission, type MissionContext } from './missions'
import { supabase, type EventRow } from './supabase'
import { CANCELLED_EVENTS } from './dayUtils'

export interface MissionResult extends Mission {
  result: { done: boolean; progress: number; total: number }
}

export interface FriendInfo {
  friend_id: string
  day: number
}

export function useGameData() {
  const { checkins, friendCheckins, events } = useAuth()
  const [coordinatorIds, setCoordinatorIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('users')
      .select('id, email')
      .in('email', COORDINATOR_EMAILS)
      .then(({ data }) => {
        if (data) setCoordinatorIds(new Set(data.map((u: { id: string }) => u.id)))
      })
  }, [])

  const missionCtx = useMemo((): MissionContext => ({ coordinatorIds }), [coordinatorIds])

  const eventInfoMap = useMemo(() =>
    new Map(events.map(e => [e.id, e])),
    [events]
  )

  const checkinEvents = useMemo(() =>
    checkins
      .filter(c => !CANCELLED_EVENTS.has(c.event_id))
      .map(c => eventInfoMap.get(c.event_id)).filter(Boolean) as EventRow[],
    [checkins, eventInfoMap]
  )

  const validCheckins = useMemo(() =>
    checkins.filter(c => !CANCELLED_EVENTS.has(c.event_id)),
    [checkins]
  )

  const friendInfos = useMemo((): FriendInfo[] =>
    friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day })),
    [friendCheckins]
  )

  const totalPoints = useMemo(() =>
    calculateTotalPoints(validCheckins, friendCheckins, checkinEvents as any, friendInfos, missionCtx),
    [validCheckins, friendCheckins, checkinEvents, friendInfos, missionCtx]
  )

  const missionResults = useMemo((): MissionResult[] =>
    MISSIONS.map(m => ({ ...m, result: m.check(checkinEvents as any, friendInfos, missionCtx) })),
    [checkinEvents, friendInfos, missionCtx]
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
    coordinatorIds,
  }
}
