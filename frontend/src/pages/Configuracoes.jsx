import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Bot, Wifi, WifiOff, RefreshCw, Trash2, ExternalLink, Loader2, AlertCircle, CheckCircle2, Key } from 'lucide-react'

const API = import.meta.env.VITE_HF_API_URL

export default function Configuracoes() {
  const { session } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const [trocandoToken, setTrocandoToken] = useState(false)
  const [novoToken, setNovoToken] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }

  const fetchStatus = async () => {
    setTestando(true)
    try {
      const r = await fetch(`${API}/api/bot/status`, { headers })
      const d = await r.json()
      setStatus(d)
    } catch {
      setStatus({ ok: false, ativo: false, error: 'Erro de conexão.' })
    } finally {
      setLoading(false)
      setTestando(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleSalvarToken = async () => {
    if (!novoToken.trim()) return
    setSalvando(true)
    setMsg({ type: '', text: '' })
    try {
      const r = await fetch(`${API}/api/bot/setup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bot_token: novoToken.trim() }),
      })
      const d = await r.json()
      if (d.ok) {
        setMsg({ type: 'ok', text: `Bot @${d.bot_username} ativado com sucesso!` })
        setTrocandoToken(false)
        setNovoToken('')
        fetchStatus()
      } else {
        setMsg({ type: 'err', text: d.error || 'Erro ao ativar.' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Erro de conexão.' })
    } finally {
      setSalvando(false)
    }
  }

  const handleDesconectar = async () => {
    if (!confirm('Desconectar o bot? Você precisará configurá-lo novamente para usar.')) return
    setDesconectando(true)
    try {
      await fetch(`${API}/api/bot/disconnect`, { method: 'DELETE', headers })
      setStatus({ ok: false, ativo: false })
      setMsg({ type: 'ok', text: 'Bot desconectado.' })
    } catch {
      setMsg({ type: 'err', text: 'Erro ao desconectar.' })
    } finally {
      setDesconectando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  const ativo = status?.ok && status?.ativo

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-muted text-sm mt-1">Gerencie seu bot do Telegram</p>
      </div>

      {/* Status card */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              ativo ? 'bg-positive/15' : 'bg-negative/15'
            }`}>
              {ativo ? <Wifi size={18} className="text-positive" /> : <WifiOff size={18} className="text-negative" />}
            </div>
            <div>
              <p className="font-medium text-sm text-white">Status do bot</p>
              <p className={`text-xs ${ativo ? 'text-positive' : 'text-negative'}`}>
                {ativo ? '● Ativo e conectado' : '● Inativo ou não configurado'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            disabled={testando}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-accent/40"
          >
            <RefreshCw size={12} className={testando ? 'animate-spin' : ''} />
            Testar
          </button>
        </div>

        {ativo && (
          <div className="grid grid-cols-2 gap-3">
            {status.bot_username && (
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-muted mb-0.5">Username</p>
                <p className="text-sm font-medium text-white">@{status.bot_username}</p>
              </div>
            )}
            {status.telegram_user_id && (
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-muted mb-0.5">Vinculado a</p>
                <p className="text-sm font-medium text-white">ID {status.telegram_user_id}</p>
              </div>
            )}
          </div>
        )}

        {status?.error && (
          <div className="flex items-center gap-2 text-negative text-sm bg-negative/10 rounded-xl px-3 py-2">
            <AlertCircle size={14} />
            {status.error}
          </div>
        )}

        {ativo && (
          <a
            href={`https://t.me/${status.bot_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10 transition-colors"
          >
            <ExternalLink size={14} />
            Abrir no Telegram
          </a>
        )}

        {!ativo && (
          <a
            href="/onboarding"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl btn-primary text-sm font-medium"
          >
            Configurar bot →
          </a>
        )}
      </div>

      {/* Trocar token */}
      {ativo && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-muted" />
              <p className="font-medium text-sm text-white">Token do bot</p>
            </div>
            <button
              onClick={() => { setTrocandoToken(!trocandoToken); setMsg({ type: '', text: '' }) }}
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              {trocandoToken ? 'Cancelar' : 'Trocar token'}
            </button>
          </div>

          {trocandoToken && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Para trocar o bot, crie um novo no @BotFather e cole o token abaixo.
              </p>
              <input
                type="text"
                className="input font-mono text-sm"
                placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxx"
                value={novoToken}
                onChange={e => setNovoToken(e.target.value)}
              />
              <button
                onClick={handleSalvarToken}
                disabled={salvando || !novoToken.trim()}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : null}
                {salvando ? 'Salvando...' : 'Salvar novo token'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {msg.text && (
        <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
          msg.type === 'ok'
            ? 'bg-positive/10 text-positive'
            : 'bg-negative/10 text-negative'
        }`}>
          {msg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Desconectar */}
      {ativo && (
        <div className="card border-negative/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-white">Desconectar bot</p>
              <p className="text-xs text-muted mt-0.5">Remove a integração com o Telegram</p>
            </div>
            <button
              onClick={handleDesconectar}
              disabled={desconectando}
              className="flex items-center gap-1.5 text-xs text-negative hover:bg-negative/10 transition-colors px-3 py-1.5 rounded-lg border border-negative/30"
            >
              {desconectando ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
