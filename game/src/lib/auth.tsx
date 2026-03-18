import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase, type UserRow, type CheckinRow, type FriendCheckinRow, type EventRow } from './supabase'

interface AuthState {
  user: UserRow | null
  loading: boolean
  checkins: CheckinRow[]
  friendCheckins: FriendCheckinRow[]
  events: EventRow[]
}

interface AuthContextType extends AuthState {
  register: (name: string, email: string) => Promise<UserRow>
  logout: () => void
  refreshData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    checkins: [],
    friendCheckins: [],
    events: [],
  })

  const loadEvents = useCallback(async () => {
    const { data } = await supabase.from('events').select('*')
    return (data ?? []) as EventRow[]
  }, [])

  const loadUserData = useCallback(async (userId: string) => {
    const [checkinsRes, friendsRes] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', userId),
      supabase.from('friend_checkins').select('*').eq('user_id', userId),
    ])
    return {
      checkins: (checkinsRes.data ?? []) as CheckinRow[],
      friendCheckins: (friendsRes.data ?? []) as FriendCheckinRow[],
    }
  }, [])

  const refreshData = useCallback(async () => {
    if (!state.user) return
    const [userData, events] = await Promise.all([
      loadUserData(state.user.id),
      loadEvents(),
    ])
    setState(prev => ({ ...prev, ...userData, events }))
  }, [state.user, loadUserData, loadEvents])

  // Boot: check localStorage for saved user
  useEffect(() => {
    const init = async () => {
      const savedId = localStorage.getItem('gamerex_user_id')
      if (!savedId) {
        const events = await loadEvents()
        setState(prev => ({ ...prev, loading: false, events }))
        return
      }

      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('id', savedId)
        .limit(1)

      const user = (users?.[0] as UserRow | undefined) ?? null
      if (!user) {
        localStorage.removeItem('gamerex_user_id')
        const events = await loadEvents()
        setState(prev => ({ ...prev, loading: false, events }))
        return
      }

      const [userData, events] = await Promise.all([
        loadUserData(user.id),
        loadEvents(),
      ])
      setState({ user, loading: false, events, ...userData })
    }
    init()
  }, [loadEvents, loadUserData])

  const register = async (name: string, email: string): Promise<UserRow> => {
    const { data, error } = await supabase.rpc('register_or_login', {
      p_name: name,
      p_email: email,
    })
    if (error) throw error
    const user = (data as UserRow[])[0]!
    localStorage.setItem('gamerex_user_id', user.id)

    const [userData, events] = await Promise.all([
      loadUserData(user.id),
      loadEvents(),
    ])
    setState({ user, loading: false, events, ...userData })
    return user
  }

  const logout = () => {
    localStorage.removeItem('gamerex_user_id')
    setState(prev => ({
      ...prev,
      user: null,
      checkins: [],
      friendCheckins: [],
    }))
  }

  return (
    <AuthContext.Provider value={{ ...state, register, logout, refreshData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
