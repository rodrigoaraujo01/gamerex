import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface EventRow {
  id: string
  type: 'oral' | 'poster' | 'plenaria' | 'stand' | 'sirr'
  day: number
  room: string | null
  time_slot: string | null
  track_code: string | null
  subtrilha: string | null
}

export interface UserRow {
  id: string
  name: string
  email: string
  created_at: string
}

export interface CheckinRow {
  id: string
  user_id: string
  event_id: string
  created_at: string
}

export interface FriendCheckinRow {
  id: string
  user_id: string
  friend_id: string
  day: number
  created_at: string
}
