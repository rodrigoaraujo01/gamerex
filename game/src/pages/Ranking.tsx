import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, type UserRow, type CheckinRow, type FriendCheckinRow, type EventRow } from '../lib/supabase'
import { MISSIONS, POINTS_PER_CHECKIN, getPlayerLevel } from '../lib/missions'
import Navbar from '../components/Navbar'

interface RankedUser {
  id: string
  name: string
  totalPoints: number
  checkinCount: number
  friendCount: number
  completedMissions: number
}

export default function Ranking() {
  const { user } = useAuth()
  const [allUsers, setAllUsers] = useState<UserRow[]>([])
  const [allCheckins, setAllCheckins] = useState<CheckinRow[]>([])
  const [allFriendCheckins, setAllFriendCheckins] = useState<FriendCheckinRow[]>([])
  const [allEvents, setAllEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [uRes, cRes, fRes, eRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('checkins').select('*'),
        supabase.from('friend_checkins').select('*'),
        supabase.from('events').select('*'),
      ])
      setAllUsers((uRes.data ?? []) as UserRow[])
      setAllCheckins((cRes.data ?? []) as CheckinRow[])
      setAllFriendCheckins((fRes.data ?? []) as FriendCheckinRow[])
      setAllEvents((eRes.data ?? []) as EventRow[])
      setLoading(false)
    }
    load()
  }, [])

  const ranking = useMemo((): RankedUser[] => {
    const eventMap = new Map(allEvents.map(e => [e.id, e]))

    return allUsers.map(u => {
      const userCheckins = allCheckins.filter(c => c.user_id === u.id)
      const userFriends = allFriendCheckins.filter(f => f.user_id === u.id)
      const eventInfos = userCheckins.map(c => eventMap.get(c.event_id)).filter(Boolean) as EventRow[]
      const friendInfos = userFriends.map(f => ({ friend_id: f.friend_id, day: f.day }))
      const uniqueFriendDays = new Set(userFriends.map(f => `${f.friend_id}-${f.day}`)).size

      const basePoints = userCheckins.length * POINTS_PER_CHECKIN
      const friendPoints = uniqueFriendDays * POINTS_PER_CHECKIN
      const missionBonus = MISSIONS.reduce(
        (sum, m) => sum + (m.check(eventInfos as any, friendInfos).done ? m.points : 0), 0
      )

      return {
        id: u.id,
        name: u.name,
        totalPoints: basePoints + friendPoints + missionBonus,
        checkinCount: userCheckins.length,
        friendCount: new Set(userFriends.map(f => f.friend_id)).size,
        completedMissions: MISSIONS.filter(m => m.check(eventInfos as any, friendInfos).done).length,
      }
    }).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [allUsers, allCheckins, allFriendCheckins, allEvents])

  const myRank = useMemo(() => {
    if (!user) return null
    const idx = ranking.findIndex(r => r.id === user.id)
    return idx >= 0 ? idx + 1 : null
  }, [ranking, user])

  const podiumEmojis = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-dvh pb-20 page-enter">
      <div className="bg-rex-card border-b border-rex-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white font-semibold text-lg">Ranking</h1>
          <p className="text-gray-500 text-sm">
            {ranking.length} jogadores
            {myRank && <span className="text-rex-green"> · Você: #{myRank}</span>}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-4xl animate-bounce">🦖</div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
          {/* My position card */}
          {myRank && (
            <div className="bg-rex-card border border-rex-green/40 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="font-game text-rex-green text-xl">#{myRank}</p>
                  <p className="text-gray-500 text-xs">posição</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{user?.name}</p>
                  <p className="text-gray-500 text-xs">
                    {ranking.find(r => r.id === user?.id)?.totalPoints ?? 0} pts ·{' '}
                    {ranking.find(r => r.id === user?.id)?.completedMissions ?? 0} missões
                  </p>
                </div>
                <p className="text-2xl">{getPlayerLevel(ranking.find(r => r.id === user?.id)?.totalPoints ?? 0).emoji}</p>
              </div>
            </div>
          )}

          {/* Leaderboard list */}
          {ranking.map((r, i) => {
            const isMe = r.id === user?.id
            const level = getPlayerLevel(r.totalPoints)
            return (
              <div
                key={r.id}
                className={`bg-rex-card border rounded-xl px-4 py-3 flex items-center gap-3 ${
                  isMe ? 'border-rex-green/40' : 'border-rex-border'
                }`}
              >
                <div className="w-8 text-center">
                  {i < 3 ? (
                    <span className="text-lg">{podiumEmojis[i]}</span>
                  ) : (
                    <span className="text-gray-500 text-sm font-semibold">{i + 1}</span>
                  )}
                </div>
                <span className="text-lg">{level.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isMe ? 'text-rex-green' : 'text-white'}`}>
                    {r.name}{isMe ? ' (você)' : ''}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {r.checkinCount} checkins · {r.friendCount} amigos · {r.completedMissions} missões
                  </p>
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap ${i < 3 ? 'text-rex-amber' : 'text-rex-green'}`}>
                  {r.totalPoints} pts
                </span>
              </div>
            )
          })}

          {ranking.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum jogador ainda</p>
          )}
        </div>
      )}

      <Navbar />
    </div>
  )
}
