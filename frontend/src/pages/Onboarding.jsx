import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Bot, MessageSquare, Key, CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_HF_API_URL

const STEPS = [
  {
    num: 1,
    icon: Bot,
    title: 'Crie seu bot no Telegram',
    desc: 'Abra o Telegram e vá até @BotFather',
  },
  {
    num: 2,
    icon: MessageSquare,
    title: 'Mande /newbot',
    desc: 'Escolha um nome e username para o seu assistente',
  },
  {
    num: 3,
    icon: Key,
    title: 'Cole o token aqui',
    desc: 'O BotFather vai te dar um token como: 123456789:AAF...',
  },
]

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [botUsername, setBotUsername] = useState('')

  useEffect(() => {
    // Se já tem bot configurado, redireciona para o dashboard
    if (!session) return
    fetch(`${API}/api/bot/status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.ativo) navigate('/', { replace: true })
      })
      .catch(() => {})
  }, [session])

  const handleActivate = async () => {
    if (!token.trim()) {
      setError('Cole o token do BotFather antes de continuar.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const resp = await fetch(`${API}/api/bot/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bot_token: token.trim() }),
      })
      const data = await resp.json()
      if (data.ok) {
        setBotUsername(data.bot_username)
        setStep(4)
      } else {
        setError(data.error || 'Erro ao ativar. Verifique o token.')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)', boxShadow: '0 0 40px rgba(249,115,22,0.5)' }}>
              <CheckCircle2 size={40} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Assistente ativo! 🎉</h1>
            <p className="text-muted">
              Seu bot <span className="text-accent font-medium">@{botUsername}</span> está configurado e pronto para uso.
            </p>
          </div>
          <div className="card space-y-3 text-left">
            <p className="text-sm text-muted font-medium">Próximos passos:</p>
            <ol className="space-y-2 text-sm text-text-2">
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">1.</span>
                <span>Abra o Telegram e procure por <span className="text-white">@{botUsername}</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">2.</span>
                <span>Mande <span className="text-white font-mono">/start</span> para vincular sua conta</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">3.</span>
                <span>Comece a usar: "gastei 50 no mercado"</span>
              </li>
            </ol>
          </div>
          <div className="flex gap-3">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
            >
              <ExternalLink size={16} />
              Abrir no Telegram
            </a>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-xl border border-border text-text-2 hover:text-white hover:border-accent/50 transition-colors text-sm font-medium"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)', boxShadow: '0 0 28px rgba(249,115,22,0.6)' }}>
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-gradient-accent font-bold text-3xl tracking-tight">VinBot</span>
          </div>
          <p className="text-text-2 text-sm">Configure seu assistente pessoal</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= n
                  ? 'text-white'
                  : 'bg-surface border border-border text-muted'
              }`}
                style={step >= n ? { background: 'linear-gradient(135deg,#F97316,#FB923C)' } : {}}>
                {n}
              </div>
              {n < 3 && (
                <div className={`h-px w-12 transition-colors ${step > n ? 'bg-accent' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {STEPS.map(({ num, icon: Icon, title, desc }) => {
            const active = step === num
            const done = step > num
            return (
              <div
                key={num}
                onClick={() => num < step && setStep(num)}
                className={`card transition-all ${
                  active ? 'border-accent/40' : done ? 'border-border opacity-60' : 'border-border opacity-40'
                } ${num < step ? 'cursor-pointer hover:opacity-80' : ''}`}
                style={active ? { boxShadow: '0 0 20px rgba(249,115,22,0.1)' } : {}}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    done ? 'bg-positive/15' : active ? 'bg-accent/15' : 'bg-surface'
                  }`}>
                    {done
                      ? <CheckCircle2 size={18} className="text-positive" />
                      : <Icon size={18} className={active ? 'text-accent' : 'text-muted'} />
                    }
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${active ? 'text-white' : 'text-text-2'}`}>{title}</p>
                    <p className="text-muted text-xs mt-0.5">{desc}</p>

                    {num === 1 && active && (
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-accent text-xs font-medium hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={12} />
                        Abrir @BotFather no Telegram
                      </a>
                    )}
                  </div>
                </div>
                {num === 1 && active && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Já abri o BotFather →
                    </button>
                  </div>
                )}
                {num === 2 && active && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setStep(3)}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Já mandei /newbot →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Token input (step 3) */}
        {step === 3 && (
          <div className="card border-accent/40 space-y-4" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.1)' }}>
            <div>
              <label className="block text-sm text-muted mb-1.5">Token do bot</label>
              <input
                type="text"
                className="input font-mono text-sm"
                placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={e => setToken(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted mt-1.5">
                O token começa com números seguidos de ":" — cole exatamente como o BotFather enviou.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-negative text-sm">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={loading || !token.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Ativando...</>
              ) : (
                <>✨ Ativar meu assistente</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
