import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getCurrentDay, getTypeLabel, getTypeEmoji, getDayLabel } from '../lib/dayUtils'
import { POINTS_PER_CHECKIN, MISSIONS } from '../lib/missions'

type ScanState =
  | { status: 'loading' }
  | { status: 'success'; eventId: string; type: string; room: string | null; day: number; newMissions: string[] }
  | { status: 'friend-success'; friendName: string }
  | { status: 'already-scanned'; eventId: string }
  | { status: 'friend-already'; friendName: string }
  | { status: 'error'; message: string }
  | { status: 'self-scan' }

export default function Scan() {
  const { code } = useParams<{ code: string }>()
  const { user, checkins, friendCheckins, events, refreshData } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ScanState>({ status: 'loading' })

  const performCheckin = useCallback(async () => {
    if (!code || !user) return

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
          setState({ status: 'friend-success', friendName: result.friend_name })
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

    // Check duplicate
    if (checkins.some(c => c.event_id === code)) {
      setState({ status: 'already-scanned', eventId: code })
      return
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 page-enter">
      {state.status === 'loading' && (
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🦖</div>
          <p className="text-gray-400">Processando checkin...</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
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
          <div className="text-6xl mb-4">🤝</div>
          <h2 className="font-game text-rex-green text-lg mb-2">Encontro!</h2>
          <div className="bg-rex-card border border-rex-green/30 rounded-2xl p-5 mb-4">
            <p className="text-white font-semibold text-lg">{state.friendName}</p>
            <p className="text-gray-400 text-sm mt-1">Vocês dois ganharam pontos!</p>
            <p className="text-rex-green font-game text-xl mt-3">+{POINTS_PER_CHECKIN} pts</p>
          </div>
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
