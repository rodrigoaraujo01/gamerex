import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') ?? '/dashboard'
  const isLogin = params.get('mode') === 'login'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedEmail) {
      setError('Informe seu email')
      return
    }
    if (!isLogin && !trimmedName) {
      setError('Informe seu nome')
      return
    }

    setLoading(true)
    try {
      await register(trimmedName || trimmedEmail.split('@')[0]!, trimmedEmail)
      navigate(redirect)
    } catch {
      setError('Erro ao registrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 page-enter">
      <div className="text-5xl mb-4">🦖</div>
      <h2 className="font-game text-rex-green text-base mb-6">
        {isLogin ? 'Entrar' : 'Cadastro'}
      </h2>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-gray-400 text-sm mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full bg-rex-card border border-rex-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-rex-green transition-colors"
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="block text-gray-400 text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu.email@petrobras.com.br"
            className="w-full bg-rex-card border border-rex-border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-rex-green transition-colors"
            required
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rex-green text-rex-bg font-semibold rounded-xl py-3 hover:bg-rex-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Começar!'}
        </button>
      </form>

      {!isLogin && (
        <p className="text-gray-500 text-xs mt-4">
          Já tem conta?{' '}
          <a href={`#/register?mode=login${redirect !== '/dashboard' ? `&redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-rex-green hover:underline">
            Entrar
          </a>
        </p>
      )}
    </div>
  )
}
