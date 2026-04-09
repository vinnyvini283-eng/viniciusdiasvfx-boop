import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.')
        return
      }
      setLoading(true)
      const { data: signUpData, error: err } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (err) {
        setError(err.message === 'User already registered'
          ? 'Este email já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.')
      } else if (signUpData?.session) {
        // Login automático (confirmação de email desativada) → onboarding
        navigate('/onboarding', { replace: true })
      } else {
        setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      }
      return
    }

    // login
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Email ou senha incorretos.')
    } else {
      navigate('/')
    }
  }

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 0 28px rgba(249,115,22,0.6)' }}>
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-gradient-accent font-bold text-3xl tracking-tight">VinBot</span>
          </div>
          <p className="text-text-2 text-sm">Seu assistente financeiro pessoal</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface border border-border rounded-xl p-1 mb-4">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'register' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-muted mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-muted mb-1.5">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-muted mb-1.5">Confirmar senha</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm" role="alert">{error}</p>
          )}

          {success && (
            <p className="text-accent text-sm" role="status">{success}</p>
          )}

          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Entrando...' : 'Criando conta...')
              : (mode === 'login' ? 'Entrar' : 'Criar conta')
            }
          </button>
        </form>
      </div>
    </div>
  )
}
