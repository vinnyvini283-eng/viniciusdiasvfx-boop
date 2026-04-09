import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Bot, Wifi, WifiOff, RefreshCw, Trash2, ExternalLink, Loader2, AlertCircle, CheckCircle2, Key, User, Target, DollarSign } from 'lucide-react'

const API = import.meta.env.VITE_HF_API_URL

export default function Configuracoes() {
  const { session } = useAuth()
  const email = session?.user?.email || ''

  // Bot state
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState(false)
  const [desconectando, setDesconectando] = useState(false)
  const [trocandoToken, setTrocandoToken] = useState(false)
  const [novoToken, setNovoToken] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Preferências state
  const [prefs, setPrefs] = useState({ salario_fixo: '', meta_investimento_pct: '' })
  const [salvandoPrefs, setSalvandoPrefs] = useState(false)
  const [msgPrefs, setMsgPrefs] = useState({ type: '', text: '' })
  const [configId, setConfigId] = useState(null)

  // Conta state
  const [enviandoReset, setEnviandoReset] = useState(false)
  const [msgConta, setMsgConta] = useState({ type: '', text: '' })

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

  useEffect(() => {
    fetchStatus()
    fetchPrefs()
  }, [])

  const fetchPrefs = async () => {
    const { data } = await supabase.from('config_financeiro').select('id,salario_fixo,meta_investimento_pct').limit(1).single()
    if (data) {
      setConfigId(data.id)
      setPrefs({
        salario_fixo: String(data.salario_fixo || '0'),
        meta_investimento_pct: String(((data.meta_investimento_pct || 0.20) * 100).toFixed(0)),
      })
    }
  }

  const handleSalvarPrefs = async (e) => {
    e.preventDefault()
    setSalvandoPrefs(true)
    setMsgPrefs({ type: '', text: '' })
    try {
      const payload = {
        salario_fixo: parseFloat(String(prefs.salario_fixo).replace(',', '.')) || 0,
        meta_investimento_pct: (parseFloat(String(prefs.meta_investimento_pct).replace(',', '.')) || 20) / 100,
      }
      if (configId) {
        await supabase.from('config_financeiro').update(payload).eq('id', configId)
      } else {
        const { data } = await supabase.from('config_financeiro').insert({ ...payload, user_id: session?.user?.id }).select().single()
        setConfigId(data?.id)
      }
      setMsgPrefs({ type: 'ok', text: 'Preferências salvas!' })
    } catch {
      setMsgPrefs({ type: 'err', text: 'Erro ao salvar.' })
    } finally {
      setSalvandoPrefs(false)
    }
  }

  const handleAlterarSenha = async () => {
    if (!email) return
    setEnviandoReset(true)
    setMsgConta({ type: '', text: '' })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      })
      if (error) throw error
      setMsgConta({ type: 'ok', text: 'Email de redefinição enviado! Verifique sua caixa de entrada.' })
    } catch {
      setMsgConta({ type: 'err', text: 'Erro ao enviar email. Tente novamente.' })
    } finally {
      setEnviandoReset(false)
    }
  }

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
        <p className="text-muted text-sm mt-1">Conta, bot do Telegram e preferências</p>
      </div>

      {/* ── CONTA ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-muted" />
          <p className="font-medium text-sm text-white">Conta</p>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Email</label>
          <input type="email" className="input" value={email} readOnly
            style={{ opacity: 0.6, cursor: 'default' }} />
        </div>
        {msgConta.text && (
          <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
            msgConta.type === 'ok' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
          }`}>
            {msgConta.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msgConta.text}
          </div>
        )}
        <button
          onClick={handleAlterarSenha}
          disabled={enviandoReset}
          className="flex items-center gap-2 text-xs text-muted hover:text-accent transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-accent/40"
        >
          {enviandoReset ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
          {enviandoReset ? 'Enviando...' : 'Enviar email de alteração de senha'}
        </button>
      </div>

      {/* ── PREFERÊNCIAS ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Target size={16} className="text-muted" />
          <p className="font-medium text-sm text-white">Preferências</p>
        </div>
        <form onSubmit={handleSalvarPrefs} className="space-y-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Salário fixo (R$)</label>
            <input
              type="text"
              className="input"
              placeholder="3500,00"
              value={prefs.salario_fixo}
              onChange={e => setPrefs(p => ({ ...p, salario_fixo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Meta de investimento (%)</label>
            <input
              type="text"
              className="input"
              placeholder="20"
              value={prefs.meta_investimento_pct}
              onChange={e => setPrefs(p => ({ ...p, meta_investimento_pct: e.target.value }))}
            />
            <p className="text-xs text-muted mt-1">% da renda total a investir por mês</p>
          </div>
          {msgPrefs.text && (
            <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${
              msgPrefs.type === 'ok' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
            }`}>
              {msgPrefs.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {msgPrefs.text}
            </div>
          )}
          <button type="submit" disabled={salvandoPrefs} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
            {salvandoPrefs ? <Loader2 size={14} className="animate-spin" /> : null}
            {salvandoPrefs ? 'Salvando...' : 'Salvar preferências'}
          </button>
        </form>
      </div>

      {/* ── TELEGRAM BOT ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Bot size={16} className="text-muted" />
          <p className="font-medium text-sm text-white">Telegram Bot</p>
        </div>
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
