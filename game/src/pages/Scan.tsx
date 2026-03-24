import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getCurrentDay, getTypeLabel, getTypeEmoji, getDayLabel, CANCELLED_EVENTS, EXTENDED_CHECKIN_EVENTS } from '../lib/dayUtils'
import { POINTS_PER_CHECKIN, MISSIONS } from '../lib/missions'

function Confetti() {
  const particles = Array.from({ length: 24 }, (_, i) => {
    const colors = ['#4ade80', '#fbbf24', '#a78bfa', '#22d3ee', '#f472b6', '#fb923c']
    const color = colors[i % colors.length]
    const left = Math.random() * 100
    const delay = Math.random() * 0.5
    const duration = 1.2 + Math.random() * 0.8
    return (
      <div
        key={i}
        className="confetti-particle"
        style={{
          left: `${left}%`,
          backgroundColor: color,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        }}
      />
    )
  })
  return <div className="confetti-container">{particles}</div>
}

type ScanState =
  | { status: 'loading' }
  | { status: 'success'; eventId: string; type: string; room: string | null; day: number; newMissions: string[] }
  | { status: 'friend-success'; friendName: string; newMissions: string[] }
  | { status: 'already-scanned'; eventId: string }
  | { status: 'friend-already'; friendName: string }
  | { status: 'wrong-day'; eventId: string; eventDay: number }
  | { status: 'simultaneous-oral'; eventId: string; conflictId: string; timeSlot: string }
  | { status: 'error'; message: string }
  | { status: 'self-scan' }

export default function Scan() {
  const { code } = useParams<{ code: string }>()
  const { user, checkins, friendCheckins, events, refreshData } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ScanState>({ status: 'loading' })
  const processedRef = useRef(false)

  const performCheckin = useCallback(async () => {
    if (!code || !user) return
    if (processedRef.current) return
    processedRef.current = true

    // Friend scan
    if (code.startsWith('U-')) {
      const friendId = code.slice(2)

      if (friendId === user.id) {
        setState({ status: 'self-scan' })
        return
      }

      try {
        const { data, error } = await supabase.rpc('scan_friend', {
          p_scanner_id: user.id,
          p_scanned_id: friendId,
          p_day: getCurrentDay(),
        })
        if (error) throw error

        const result = (data as { friend_name: string; already_scanned: boolean }[])[0]
        if (!result) throw new Error('Usuário não encontrado')

        await refreshData()

        if (result.already_scanned) {
          setState({ status: 'friend-already', friendName: result.friend_name })
        } else {
          // Check newly completed missions after friend scan
          const eventInfos = checkins.map(c => events.find(e => e.id === c.event_id)).filter(Boolean)
          const oldFriendInfos = friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day }))
          const newFriendInfos = [...oldFriendInfos, { friend_id: friendId, day: getCurrentDay() }]

          const newMissions = MISSIONS.filter(m => {
            const nowDone = m.check(eventInfos as any, newFriendInfos).done
            const wasDone = m.check(eventInfos as any, oldFriendInfos).done
            return nowDone && !wasDone
          }).map(m => m.name)

          setState({ status: 'friend-success', friendName: result.friend_name, newMissions })
        }
      } catch {
        setState({ status: 'error', message: 'Não foi possível registrar o encontro. O QR Code é válido?' })
      }
      return
    }

    // Event scan
    const event = events.find(e => e.id === code)
    if (!event) {
      setState({ status: 'error', message: `Evento "${code}" não encontrado` })
      return
    }

    // Block cancelled events
    if (CANCELLED_EVENTS.has(code)) {
      setState({ status: 'error', message: 'Este evento foi cancelado.' })
      return
    }

    // Rule 3: Check event day matches current day (skip for activity types — available all days)
    const ALL_DAYS_TYPES = new Set(['sirr', 'happyhour', 'geolink', 'dado', 'agora', 'poco', 'gamee', 'camalis'])
    const today = getCurrentDay()
    if (!ALL_DAYS_TYPES.has(event.type) && event.day !== today) {
      // Allow extended checkin: events presented on D1 can also be checked in on D2
      const isExtended = EXTENDED_CHECKIN_EVENTS.has(event.id) && today === 2 && event.day === 1
      if (!isExtended) {
        setState({ status: 'wrong-day', eventId: code, eventDay: event.day })
        return
      }
    }

    // Check duplicate
    if (checkins.some(c => c.event_id === code)) {
      setState({ status: 'already-scanned', eventId: code })
      return
    }

    // Rule 4: Block simultaneous oral presentations
    if (event.type === 'oral' && event.time_slot) {
      const conflict = checkins.find(c => {
        const ev = events.find(e => e.id === c.event_id)
        return ev && ev.type === 'oral' && ev.day === event.day && ev.time_slot === event.time_slot
      })
      if (conflict) {
        setState({
          status: 'simultaneous-oral',
          eventId: code,
          conflictId: conflict.event_id,
          timeSlot: event.time_slot,
        })
        return
      }
    }

    try {
      const { error } = await supabase.from('checkins').insert({
        user_id: user.id,
        event_id: code,
      })

      if (error) {
        if (error.code === '23505') {
          setState({ status: 'already-scanned', eventId: code })
          return
        }
        throw error
      }

      await refreshData()

      // Check newly completed missions
      const eventInfos = [...checkins.map(c => events.find(e => e.id === c.event_id)).filter(Boolean), event]
      const friendInfos = friendCheckins.map(f => ({ friend_id: f.friend_id, day: f.day }))
      const oldEventInfos = checkins.map(c => events.find(e => e.id === c.event_id)).filter(Boolean)

      const newMissions = MISSIONS.filter(m => {
        const nowDone = m.check(eventInfos as any, friendInfos).done
        const wasDone = m.check(oldEventInfos as any, friendInfos).done
        return nowDone && !wasDone
      }).map(m => m.name)

      setState({
        status: 'success',
        eventId: code,
        type: event.type,
        room: event.room,
        day: event.day,
        newMissions,
      })
    } catch {
      setState({ status: 'error', message: 'Erro ao fazer checkin. Tente novamente.' })
    }
  }, [code, user, events, checkins, friendCheckins, refreshData])

  useEffect(() => {
    if (!user) {
      navigate(`/register?redirect=/scan/${encodeURIComponent(code ?? '')}`)
      return
    }
    performCheckin()
  }, [user, code, navigate, performCheckin])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 page-enter pt-safe">
      {state.status === 'loading' && (
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🦖</div>
          <p className="text-gray-400">Processando checkin...</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="text-center max-w-sm">
          <Confetti />
          <div className="text-6xl mb-4 scan-bounce">✅</div>
          <h2 className="font-game text-rex-green text-lg mb-2">Checkin!</h2>
          <div className="bg-rex-card border border-rex-green/30 rounded-2xl p-5 mb-4">
            <p className="text-2xl mb-2">{getTypeEmoji(state.type)}</p>
            <p className="text-white font-semibold text-lg">{state.eventId}</p>
            <p className="text-gray-400 text-sm">{getTypeLabel(state.type)}</p>
            {state.room && <p className="text-gray-500 text-xs">{state.room}</p>}
            <p className="text-gray-500 text-xs">{getDayLabel(state.day)}</p>
            <p className="text-rex-green font-game text-xl mt-3">+{POINTS_PER_CHECKIN} pts</p>
          </div>

          {state.newMissions.length > 0 && (
            <div className="bg-rex-card border border-rex-amber/30 rounded-2xl p-4 mb-4 toast">
              <p className="text-rex-amber font-semibold text-sm mb-2">🎉 Missão Concluída!</p>
              {state.newMissions.map(name => (
                <p key={name} className="text-white text-sm">{name}</p>
              ))}
            </div>
          )}

          <Link to="/dashboard" className="inline-block bg-rex-green text-rex-bg font-semibold rounded-xl py-3 px-8 hover:bg-rex-green-dark transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'friend-success' && (
        <div className="text-center max-w-sm">
          <Confetti />
          <div className="text-6xl mb-4 scan-bounce">🤝</div>
          <h2 className="font-game text-rex-green text-lg mb-2">Encontro!</h2>
          <div className="bg-rex-card border border-rex-green/30 rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold text-lg">{state.friendName}</p>
            <p className="text-gray-400 text-sm mt-1">Vocês dois ganharam pontos!</p>
            <p className="text-rex-green font-game text-xl mt-3">+{POINTS_PER_CHECKIN} pts</p>
          </div>

          {state.newMissions.length > 0 && (
            <div className="bg-rex-card border border-rex-amber/30 rounded-2xl p-4 mb-4 toast">
              <p className="text-rex-amber font-semibold text-sm mb-2">🎉 Missão Concluída!</p>
              {state.newMissions.map(name => (
                <p key={name} className="text-white text-sm">{name}</p>
              ))}
            </div>
          )}

          <Link to="/dashboard" className="inline-block bg-rex-green text-rex-bg font-semibold rounded-xl py-3 px-8 hover:bg-rex-green-dark transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'already-scanned' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-rex-amber font-semibold text-lg mb-2">Já Escaneado</h2>
          <p className="text-gray-400 text-sm mb-4">
            Você já fez checkin em <span className="text-white">{state.eventId}</span>
          </p>
          <Link to="/dashboard" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'friend-already' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-rex-amber font-semibold text-lg mb-2">Já se encontraram hoje</h2>
          <p className="text-gray-400 text-sm mb-4">
            Você e <span className="text-white">{state.friendName}</span> já fizeram checkin hoje!
          </p>
          <Link to="/dashboard" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'wrong-day' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-rex-amber font-semibold text-lg mb-2">Dia Incorreto</h2>
          <p className="text-gray-400 text-sm mb-4">
            O evento <span className="text-white">{state.eventId}</span> é do{' '}
            <span className="text-rex-amber">{getDayLabel(state.eventDay)}</span>.
            <br />Checkin só é permitido no dia do evento.
          </p>
          <Link to="/dashboard" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'simultaneous-oral' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-rex-amber font-semibold text-lg mb-2">Horário Conflitante</h2>
          <p className="text-gray-400 text-sm mb-4">
            Você já fez checkin em <span className="text-white">{state.conflictId}</span> no
            horário <span className="text-rex-amber">{state.timeSlot}</span>.
            <br />Não é possível assistir duas orais simultâneas.
          </p>
          <Link to="/dashboard" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Voltar
          </Link>
        </div>
      )}

      {state.status === 'self-scan' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🪞</div>
          <h2 className="text-rex-amber font-semibold text-lg mb-2">Esse é o seu QR!</h2>
          <p className="text-gray-400 text-sm mb-4">
            Peça para um colega escanear o seu código!
          </p>
          <Link to="/myqr" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Ver meu QR
          </Link>
        </div>
      )}

      {state.status === 'error' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-red-400 font-semibold text-lg mb-2">Erro</h2>
          <p className="text-gray-400 text-sm mb-4">{state.message}</p>
          <Link to="/dashboard" className="inline-block border border-rex-border text-gray-300 rounded-xl py-3 px-8 hover:border-rex-green/50 transition-colors">
            Voltar
          </Link>
        </div>
      )}
    </div>
  )
}
