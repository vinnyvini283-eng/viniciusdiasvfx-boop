import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Trash2, Check, X, Edit2, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function ProjecaoCalculadora({ cdiBase, projecao, setProjecao }) {
  const [aberto, setAberto] = useState(false)

  const dados = useMemo(() => {
    const principal = parseFloat(String(projecao.principal).replace(',', '.')) || 0
    const pct = parseFloat(String(projecao.rentabilidade_pct).replace(',', '.')) || 0
    const meses = parseInt(projecao.meses) || 12
    if (principal <= 0) return []

    let taxaAa
    if (projecao.indice === 'CDI') taxaAa = (pct / 100) * cdiBase
    else if (projecao.indice === 'Poupança') taxaAa = 0.7 * cdiBase
    else taxaAa = pct // Prefixado ou IPCA+

    const taxaMensal = Math.pow(1 + taxaAa / 100, 1 / 12) - 1
    return Array.from({ length: meses + 1 }, (_, i) => ({
      mes: i === 0 ? 'Hoje' : `${i}m`,
      valor: parseFloat((principal * Math.pow(1 + taxaMensal, i)).toFixed(2)),
    }))
  }, [projecao, cdiBase])

  const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  const ganho = dados.length > 1 ? dados[dados.length - 1].valor - dados[0].valor : 0

  return (
    <div className="card">
      <button onClick={() => setAberto(p => !p)} className="w-full flex items-center justify-between text-sm font-semibold text-text p-5">
        <span>Calculadora de projeção</span>
        <span className="text-muted text-xs">{aberto ? '▲ fechar' : '▼ abrir'}</span>
      </button>
      {aberto && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-2 uppercase tracking-wider">Principal (R$)</label>
              <input value={projecao.principal} onChange={e => setProjecao(p => ({ ...p, principal: e.target.value }))}
                className="input" placeholder="10000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-2 uppercase tracking-wider">Índice</label>
              <select value={projecao.indice} onChange={e => setProjecao(p => ({ ...p, indice: e.target.value }))} className="input">
                <option value="CDI">CDI</option>
                <option value="IPCA">IPCA+</option>
                <option value="Prefixado">Prefixado</option>
                <option value="Poupança">Poupança (auto)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-2 uppercase tracking-wider">
                {projecao.indice === 'CDI' ? '% do CDI' : projecao.indice === 'Poupança' ? '—' : '% a.a.'}
              </label>
              <input value={projecao.rentabilidade_pct}
                onChange={e => setProjecao(p => ({ ...p, rentabilidade_pct: e.target.value }))}
                className="input" placeholder={projecao.indice === 'CDI' ? '110' : '13.5'}
                disabled={projecao.indice === 'Poupança'} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-2 uppercase tracking-wider">Período (meses)</label>
              <select value={projecao.meses} onChange={e => setProjecao(p => ({ ...p, meses: e.target.value }))} className="input">
                {[6, 12, 18, 24, 36, 60].map(m => <option key={m} value={m}>{m} meses</option>)}
              </select>
            </div>
          </div>

          {dados.length > 1 && (
            <>
              <div className="flex gap-4 text-sm">
                <div className="card flex-1 text-center py-3">
                  <p className="text-muted text-xs mb-1">Valor final</p>
                  <p className="text-accent font-bold text-lg">{fmt(dados[dados.length - 1].valor)}</p>
                </div>
                <div className="card flex-1 text-center py-3">
                  <p className="text-muted text-xs mb-1">Ganho</p>
                  <p className="text-positive font-bold text-lg">+{fmt(ganho)}</p>
                </div>
                <div className="card flex-1 text-center py-3">
                  <p className="text-muted text-xs mb-1">CDI base</p>
                  <p className="text-text font-bold text-lg">{cdiBase}%</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dados}>
                  <defs>
                    <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{ fill: '#71717A', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="valor" stroke="#F97316" fill="url(#gProj)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CATS = ['Alimentação','Transporte','Lazer','Vestuário','Saúde','Educação','Moradia','Assinatura','Outros']

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtInput = (v) => String(v || '').replace('.', ',')
const today = () => new Date().toISOString().split('T')[0]

const TABS = [
  { id: 'resumo',       label: 'Resumo' },
  { id: 'lancamentos',  label: 'Lançamentos' },
  { id: 'fixas',        label: 'Fixas' },
  { id: 'entradas',     label: 'Entradas' },
  { id: 'investimentos',label: 'Investimentos' },
]

export default function Financeiro() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano] = useState(now.getFullYear())
  const [tab, setTab] = useState('resumo')
  const [loading, setLoading] = useState(true)

  const [config, setConfig] = useState(null)
  const [contasFixas, setContasFixas] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [entradas, setEntradas] = useState([])
  const [investimentos, setInvestimentos] = useState([])

  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroBusca, setFiltroBusca] = useState('')

  const [editingFixa, setEditingFixa] = useState(null) // { id, field: 'nome'|'valor', val }
  const [editingLan, setEditingLan] = useState(null)
  const [editingLanVal, setEditingLanVal] = useState('')

  // Modais
  const [modal, setModal] = useState(null)

  // Form states
  const [formLan, setFormLan] = useState({ descricao: '', valor: '', categoria: 'Alimentação', data: today() })
  const [formEnt, setFormEnt] = useState({ descricao: '', valor: '', tipo: 'freela', data: today() })
  const [formInv, setFormInv] = useState({ descricao: '', valor: '', tipo: 'Renda Fixa', indice: 'CDI', rentabilidade_pct: '', data: today() })
  const [formConfig, setFormConfig] = useState({ salario_fixo: '', meta_investimento_pct: '0.20', cdi_atual: '13.75' })
  const [projecao, setProjecao] = useState({ principal: '', indice: 'CDI', rentabilidade_pct: '100', meses: '12' })
  const [formFixa, setFormFixa] = useState({ nome: '', valor: '' })
  const [saving, setSaving] = useState(false)

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser()
    return data.user?.id
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [cfg, fixas, lans, ents, invs] = await Promise.all([
      supabase.from('config_financeiro').select('*').limit(1).single(),
      supabase.from('contas_fixas').select('*').order('criado_em', { ascending: true }),
      supabase.from('lancamentos').select('*').eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
      supabase.from('entradas').select('*').eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
      supabase.from('investimentos').select('*').eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
    ])
    setConfig(cfg.data)
    setContasFixas(fixas.data || [])
    setLancamentos(lans.data || [])
    setEntradas(ents.data || [])
    setInvestimentos(invs.data || [])
    if (cfg.data) {
      setFormConfig({ salario_fixo: cfg.data.salario_fixo || '', meta_investimento_pct: cfg.data.meta_investimento_pct || '0.20', cdi_atual: cfg.data.cdi_atual || '13.75' })
    }
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { load() }, [load])

  const salario = parseFloat(config?.salario_fixo || 0)
  const totalFreela = entradas.reduce((s, r) => s + parseFloat(r.valor), 0)
  const totalEnt = salario + totalFreela
  const totalFix = contasFixas.filter(c => c.ativo).reduce((s, c) => s + parseFloat(c.valor || 0), 0)
  const totalVar = lancamentos.reduce((s, r) => s + parseFloat(r.valor), 0)
  const totalInv = investimentos.reduce((s, r) => s + parseFloat(r.valor), 0)
  const saldo = totalEnt - totalFix - totalVar - totalInv
  const metaInv = totalEnt * parseFloat(config?.meta_investimento_pct || 0.20)
  const pctMeta = metaInv > 0 ? (totalInv / metaInv * 100) : 0

  const lans_filtrados = lancamentos.filter(l =>
    (filtroCategoria === 'Todas' || l.categoria === filtroCategoria) &&
    (filtroBusca === '' || l.descricao.toLowerCase().includes(filtroBusca.toLowerCase()))
  )

  // ── AÇÕES ──

  const deleteLan = async (id) => {
    if (!confirm('Excluir lançamento?')) return
    await supabase.from('lancamentos').delete().eq('id', id)
    setLancamentos(prev => prev.filter(l => l.id !== id))
  }

  const saveEditLan = async (id) => {
    const val = parseFloat(String(editingLanVal).replace(',', '.'))
    if (!val || val <= 0) return
    await supabase.from('lancamentos').update({ valor: val }).eq('id', id)
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, valor: val } : l))
    setEditingLan(null)
  }

  const criarFixa = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const val = parseFloat(String(formFixa.valor).replace(',', '.')) || 0
    const { data, error } = await supabase.from('contas_fixas').insert({
      user_id: userId, nome: formFixa.nome, valor: val, ativo: true,
    }).select().single()
    setSaving(false)
    if (!error) {
      setContasFixas(prev => [...prev, data])
      setFormFixa({ nome: '', valor: '' })
      setModal(null)
    }
  }

  const saveEditFixa = async (id, field, rawVal) => {
    const val = field === 'valor' ? (parseFloat(String(rawVal).replace(',', '.')) || 0) : rawVal
    await supabase.from('contas_fixas').update({ [field]: val }).eq('id', id)
    setContasFixas(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
    setEditingFixa(null)
  }

  const toggleFixa = async (id, ativo) => {
    await supabase.from('contas_fixas').update({ ativo: !ativo }).eq('id', id)
    setContasFixas(prev => prev.map(c => c.id === id ? { ...c, ativo: !ativo } : c))
  }

  const deleteFixa = async (id) => {
    if (!confirm('Excluir esta conta fixa?')) return
    await supabase.from('contas_fixas').delete().eq('id', id)
    setContasFixas(prev => prev.filter(c => c.id !== id))
  }

  const deleteEntrada = async (id) => {
    if (!confirm('Excluir entrada?')) return
    await supabase.from('entradas').delete().eq('id', id)
    setEntradas(prev => prev.filter(e => e.id !== id))
  }

  const deleteInv = async (id) => {
    if (!confirm('Excluir investimento?')) return
    await supabase.from('investimentos').delete().eq('id', id)
    setInvestimentos(prev => prev.filter(i => i.id !== id))
  }

  // ── CRIAR ──

  const criarLancamento = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const val = parseFloat(String(formLan.valor).replace(',', '.'))
    const d = new Date(formLan.data + 'T12:00:00')
    const { data, error } = await supabase.from('lancamentos').insert({
      user_id: userId,
      descricao: formLan.descricao,
      valor: val,
      categoria: formLan.categoria,
      data: formLan.data,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
    }).select().single()
    setSaving(false)
    if (!error) {
      setLancamentos(prev => [data, ...prev])
      setFormLan({ descricao: '', valor: '', categoria: 'Alimentação', data: today() })
      setModal(null)
    }
  }

  const criarEntrada = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const val = parseFloat(String(formEnt.valor).replace(',', '.'))
    const d = new Date(formEnt.data + 'T12:00:00')
    const { data, error } = await supabase.from('entradas').insert({
      user_id: userId,
      descricao: formEnt.descricao,
      valor: val,
      tipo: formEnt.tipo,
      data: formEnt.data,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
    }).select().single()
    setSaving(false)
    if (!error) {
      setEntradas(prev => [data, ...prev])
      setFormEnt({ descricao: '', valor: '', tipo: 'freela', data: today() })
      setModal(null)
    }
  }

  const criarInvestimento = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const val = parseFloat(String(formInv.valor).replace(',', '.'))
    const d = new Date(formInv.data + 'T12:00:00')
    const { data, error } = await supabase.from('investimentos').insert({
      user_id: userId,
      descricao: formInv.descricao,
      valor: val,
      tipo: formInv.tipo,
      indice: formInv.indice || null,
      rentabilidade_pct: formInv.rentabilidade_pct ? parseFloat(String(formInv.rentabilidade_pct).replace(',', '.')) : null,
      data: formInv.data,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
    }).select().single()
    setSaving(false)
    if (!error) {
      setInvestimentos(prev => [data, ...prev])
      setFormInv({ descricao: '', valor: '', tipo: 'Renda Fixa', indice: 'CDI', rentabilidade_pct: '', data: today() })
      setModal(null)
    }
  }

  const salvarConfig = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const payload = {
      user_id: userId,
      salario_fixo: parseFloat(String(formConfig.salario_fixo).replace(',', '.')),
      meta_investimento_pct: parseFloat(String(formConfig.meta_investimento_pct).replace(',', '.')),
      cdi_atual: parseFloat(String(formConfig.cdi_atual || '13.75').replace(',', '.')),
    }
    if (config?.id) {
      await supabase.from('config_financeiro').update(payload).eq('id', config.id)
      setConfig(prev => ({ ...prev, ...payload }))
    } else {
      const { data } = await supabase.from('config_financeiro').insert(payload).select().single()
      setConfig(data)
    }
    setSaving(false)
    setModal(null)
  }

  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text tracking-tight">Financeiro</h1>
          <p className="text-text-2 text-sm">{MONTHS[mes - 1]} {ano}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('config')}
            className="btn-outline text-xs px-3 py-2">
            ⚙ Salário & Meta
          </button>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input w-32 text-sm" aria-label="Mês">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m} {ano}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 overflow-x-auto border border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 ${
              tab === t.id ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── RESUMO ── */}
          {tab === 'resumo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: 'Saldo', value: saldo, cls: saldo >= 0 ? 'value-positive' : 'value-negative' },
                  { label: 'Entradas', value: totalEnt, cls: 'value-positive' },
                  { label: 'Fixas', value: totalFix, cls: 'text-warning' },
                  { label: 'Variáveis', value: totalVar, cls: 'value-negative' },
                  { label: 'Investido', value: totalInv, cls: 'text-accent2' },
                  { label: `Meta ${pctMeta.toFixed(0)}%`, value: metaInv, cls: pctMeta >= 100 ? 'value-positive' : 'text-warning' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="card">
                    <p className="text-muted text-xs uppercase tracking-widest mb-2">{label}</p>
                    <p className={`text-2xl font-semibold tracking-tight ${cls}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted">Meta de Investimento ({((config?.meta_investimento_pct || 0.20) * 100).toFixed(0)}%)</span>
                  <span className="text-text font-medium">{fmt(totalInv)} / {fmt(metaInv)}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${pctMeta >= 100 ? 'bg-positive' : 'bg-accent'}`}
                    style={{ width: `${Math.min(pctMeta, 100)}%` }} />
                </div>
              </div>

              <div className="card space-y-2.5">
                <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Breakdown</h2>
                {[
                  { label: 'Salário',        value: salario,     cls: 'value-positive' },
                  { label: 'Freela / Extra', value: totalFreela, cls: 'text-gradient-accent' },
                  { label: '− Despesas Fixas', value: totalFix, cls: 'text-warning' },
                  { label: '− Gastos Variáveis', value: totalVar, cls: 'value-negative' },
                  { label: '− Investimentos', value: totalInv,   cls: 'text-accent2' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted">{label}</span>
                    <span className={`text-sm font-semibold ${cls}`}>{fmt(value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-semibold text-text">= Saldo Final</span>
                  <span className={`text-xl font-bold ${saldo >= 0 ? 'value-positive' : 'value-negative'}`}>{fmt(saldo)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── LANÇAMENTOS ── */}
          {tab === 'lancamentos' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                  placeholder="Buscar descrição..." className="input flex-1 min-w-36 text-sm" />
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="input w-36 text-sm">
                  <option value="Todas">Todas</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setModal('lancamento')} className="btn-primary flex items-center gap-1.5">
                  <Plus size={15} /> Novo
                </button>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-4 py-3 text-xs uppercase tracking-wider">Data</th>
                      <th className="text-left text-muted font-medium px-4 py-3 text-xs uppercase tracking-wider">Descrição</th>
                      <th className="text-left text-muted font-medium px-4 py-3 text-xs uppercase tracking-wider">Categoria</th>
                      <th className="text-right text-muted font-medium px-4 py-3 text-xs uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {lans_filtrados.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-16 text-muted">Nenhum lançamento</td></tr>
                    ) : lans_filtrados.map(l => (
                      <tr key={l.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-4 py-3 text-text-2 text-xs whitespace-nowrap">
                          {new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-text">{l.descricao}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-surface text-text-2 text-xs border border-border">{l.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold value-negative whitespace-nowrap">
                          {editingLan === l.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <input value={editingLanVal} onChange={e => setEditingLanVal(e.target.value)}
                                className="input w-24 text-right text-sm py-1" autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') saveEditLan(l.id); if (e.key === 'Escape') setEditingLan(null) }} />
                              <button onClick={() => saveEditLan(l.id)} className="text-accent cursor-pointer"><Check size={14} /></button>
                              <button onClick={() => setEditingLan(null)} className="text-muted cursor-pointer"><X size={14} /></button>
                            </div>
                          ) : fmt(l.valor)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setEditingLan(l.id); setEditingLanVal(fmtInput(l.valor)) }}
                              className="text-muted hover:text-accent transition-colors cursor-pointer"><Edit2 size={13} /></button>
                            <button onClick={() => deleteLan(l.id)}
                              className="text-muted hover:text-negative transition-colors cursor-pointer"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {lans_filtrados.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border bg-surface/20">
                        <td colSpan={3} className="px-4 py-2.5 text-xs text-muted">{lans_filtrados.length} registros</td>
                        <td className="px-4 py-2.5 text-right font-bold value-negative">
                          {fmt(lans_filtrados.reduce((s, l) => s + parseFloat(l.valor), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ── FIXAS ── */}
          {tab === 'fixas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-text-2 text-sm">Clique no nome ou valor para editar.</p>
                <button onClick={() => setModal('fixa')} className="btn-primary flex items-center gap-1.5">
                  <Plus size={15} /> Nova Conta
                </button>
              </div>

              <div className="card p-0 overflow-hidden">
                {contasFixas.length === 0 ? (
                  <p className="text-center py-16 text-muted text-sm">Nenhuma conta fixa cadastrada</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {contasFixas.map(c => (
                      <li key={c.id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${c.ativo ? 'hover:bg-surface/40' : 'opacity-40 hover:bg-surface/20'}`}>

                        {/* Toggle ativo */}
                        <button onClick={() => toggleFixa(c.id, c.ativo)} className="flex-shrink-0 cursor-pointer">
                          {c.ativo
                            ? <ToggleRight size={20} className="text-accent" />
                            : <ToggleLeft size={20} className="text-muted" />}
                        </button>

                        {/* Nome editável */}
                        <div className="flex-1 min-w-0">
                          {editingFixa?.id === c.id && editingFixa?.field === 'nome' ? (
                            <div className="flex items-center gap-2">
                              <input value={editingFixa.val}
                                onChange={e => setEditingFixa(p => ({ ...p, val: e.target.value }))}
                                className="input py-1 text-sm" autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditFixa(c.id, 'nome', editingFixa.val)
                                  if (e.key === 'Escape') setEditingFixa(null)
                                }} />
                              <button onClick={() => saveEditFixa(c.id, 'nome', editingFixa.val)} className="text-accent cursor-pointer"><Check size={14} /></button>
                              <button onClick={() => setEditingFixa(null)} className="text-muted cursor-pointer"><X size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingFixa({ id: c.id, field: 'nome', val: c.nome })}
                              className="text-sm font-medium text-text hover:text-accent transition-colors cursor-pointer text-left">
                              {c.nome}
                            </button>
                          )}
                        </div>

                        {/* Valor editável */}
                        {editingFixa?.id === c.id && editingFixa?.field === 'valor' ? (
                          <div className="flex items-center gap-2">
                            <input value={editingFixa.val}
                              onChange={e => setEditingFixa(p => ({ ...p, val: e.target.value }))}
                              className="input w-28 text-right py-1 text-sm" autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEditFixa(c.id, 'valor', editingFixa.val)
                                if (e.key === 'Escape') setEditingFixa(null)
                              }} />
                            <button onClick={() => saveEditFixa(c.id, 'valor', editingFixa.val)} className="text-accent cursor-pointer"><Check size={14} /></button>
                            <button onClick={() => setEditingFixa(null)} className="text-muted cursor-pointer"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingFixa({ id: c.id, field: 'valor', val: fmtInput(c.valor) })}
                            className="text-base font-semibold text-warning hover:text-accent transition-colors cursor-pointer whitespace-nowrap">
                            {fmt(c.valor)}
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => deleteFixa(c.id)}
                          className="text-muted hover:text-negative transition-colors cursor-pointer flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-text">Total Ativo</span>
                  <p className="text-xs text-text-2">{contasFixas.filter(c => c.ativo).length} de {contasFixas.length} contas</p>
                </div>
                <span className="text-xl font-bold text-warning">{fmt(totalFix)}</span>
              </div>
            </div>
          )}

          {/* ── ENTRADAS ── */}
          {tab === 'entradas' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="grid grid-cols-3 gap-3 flex-1 mr-3">
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Salário</p>
                    <p className="text-xl font-semibold text-text">{fmt(salario)}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Freela</p>
                    <p className="text-xl font-semibold text-gradient-accent">{fmt(totalFreela)}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Total</p>
                    <p className="text-xl font-semibold value-positive">{fmt(totalEnt)}</p></div>
                </div>
                <button onClick={() => setModal('entrada')} className="btn-primary flex items-center gap-1.5 self-start">
                  <Plus size={15} /> Nova
                </button>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Data</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Descrição</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-right text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Valor</th>
                      <th className="px-5 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-16 text-muted">Nenhuma entrada registrada</td></tr>
                    ) : entradas.map(r => (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-5 py-3 text-text-2 text-xs whitespace-nowrap">
                          {r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-3 text-text">{r.descricao}</td>
                        <td className="px-5 py-3">
                          <span className="badge bg-accent/10 text-accent border-accent/20 text-xs">{r.tipo}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold value-positive">{fmt(r.valor)}</td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => deleteEntrada(r.id)} className="text-muted hover:text-negative transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INVESTIMENTOS ── */}
          {tab === 'investimentos' && (
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Investido</p>
                    <p className="text-xl font-semibold text-accent2">{fmt(totalInv)}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Meta</p>
                    <p className="text-xl font-semibold text-warning">{fmt(metaInv)}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Progresso</p>
                    <p className={`text-xl font-semibold ${pctMeta >= 100 ? 'value-positive' : 'text-warning'}`}>{pctMeta.toFixed(0)}%</p></div>
                </div>
                <button onClick={() => setModal('investimento')} className="btn-primary flex items-center gap-1.5 self-start">
                  <Plus size={15} /> Novo
                </button>
              </div>

              <div className="card">
                <div className="flex justify-between text-sm mb-2.5">
                  <span className="text-muted">Meta do mês</span>
                  <span className="text-text font-medium">{fmt(totalInv)} / {fmt(metaInv)}</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${pctMeta >= 100 ? 'bg-positive' : 'bg-accent'}`}
                    style={{ width: `${Math.min(pctMeta, 100)}%` }} />
                </div>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Data</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Descrição</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Rentabilidade</th>
                      <th className="text-right text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Valor</th>
                      <th className="px-5 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {investimentos.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-16 text-muted">Nenhum investimento este mês</td></tr>
                    ) : investimentos.map(r => (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-5 py-3 text-text-2 text-xs whitespace-nowrap">
                          {r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-3 text-text">{r.descricao}</td>
                        <td className="px-5 py-3">
                          <span className="badge bg-accent2/10 text-accent2 text-xs">{r.tipo || '—'}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-muted">
                          {r.rentabilidade_pct ? (
                            <span className="text-positive font-medium">
                              {r.indice === 'CDI' ? `${r.rentabilidade_pct}% CDI` :
                               r.indice === 'IPCA' ? `IPCA+${r.rentabilidade_pct}%` :
                               r.indice === 'Prefixado' ? `${r.rentabilidade_pct}% a.a.` :
                               `${r.rentabilidade_pct}%`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-accent2">{fmt(r.valor)}</td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => deleteInv(r.id)} className="text-muted hover:text-negative transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculadora de projeção */}
              <ProjecaoCalculadora cdiBase={parseFloat(config?.cdi_atual || 13.75)} projecao={projecao} setProjecao={setProjecao} />
            </div>
          )}
        </>
      )}

      {/* ── MODAL LANÇAMENTO ── */}
      {modal === 'lancamento' && (
        <Modal title="Novo Lançamento" onClose={() => setModal(null)}>
          <form onSubmit={criarLancamento} className="space-y-4">
            <Field label="Descrição">
              <input value={formLan.descricao} onChange={e => setFormLan(p => ({ ...p, descricao: e.target.value }))}
                className="input" placeholder="Ex: Mercado, Uber..." required autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)">
                <input value={formLan.valor} onChange={e => setFormLan(p => ({ ...p, valor: e.target.value }))}
                  className="input" placeholder="0,00" required type="text" />
              </Field>
              <Field label="Data">
                <input value={formLan.data} onChange={e => setFormLan(p => ({ ...p, data: e.target.value }))}
                  className="input" type="date" required />
              </Field>
            </div>
            <Field label="Categoria">
              <select value={formLan.categoria} onChange={e => setFormLan(p => ({ ...p, categoria: e.target.value }))} className="input">
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL ENTRADA ── */}
      {modal === 'entrada' && (
        <Modal title="Nova Entrada" onClose={() => setModal(null)}>
          <form onSubmit={criarEntrada} className="space-y-4">
            <Field label="Descrição">
              <input value={formEnt.descricao} onChange={e => setFormEnt(p => ({ ...p, descricao: e.target.value }))}
                className="input" placeholder="Ex: Projeto X, Consultoria..." required autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)">
                <input value={formEnt.valor} onChange={e => setFormEnt(p => ({ ...p, valor: e.target.value }))}
                  className="input" placeholder="0,00" required />
              </Field>
              <Field label="Data">
                <input value={formEnt.data} onChange={e => setFormEnt(p => ({ ...p, data: e.target.value }))}
                  className="input" type="date" required />
              </Field>
            </div>
            <Field label="Tipo">
              <select value={formEnt.tipo} onChange={e => setFormEnt(p => ({ ...p, tipo: e.target.value }))} className="input">
                <option value="freela">Freela</option>
                <option value="salario">Salário</option>
                <option value="bonus">Bônus</option>
                <option value="outro">Outro</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL INVESTIMENTO ── */}
      {modal === 'investimento' && (
        <Modal title="Novo Investimento" onClose={() => setModal(null)}>
          <form onSubmit={criarInvestimento} className="space-y-4">
            <Field label="Descrição">
              <input value={formInv.descricao} onChange={e => setFormInv(p => ({ ...p, descricao: e.target.value }))}
                className="input" placeholder="Ex: Tesouro Direto, CDB XP..." required autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)">
                <input value={formInv.valor} onChange={e => setFormInv(p => ({ ...p, valor: e.target.value }))}
                  className="input" placeholder="0,00" required />
              </Field>
              <Field label="Data">
                <input value={formInv.data} onChange={e => setFormInv(p => ({ ...p, data: e.target.value }))}
                  className="input" type="date" required />
              </Field>
            </div>
            <Field label="Tipo">
              <select value={formInv.tipo} onChange={e => setFormInv(p => ({ ...p, tipo: e.target.value }))} className="input">
                <option value="Renda Fixa">Renda Fixa</option>
                <option value="Renda Variável">Renda Variável</option>
                <option value="Cripto">Cripto</option>
                <option value="FII">FII</option>
                <option value="Previdência">Previdência</option>
                <option value="Outro">Outro</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Índice">
                <select value={formInv.indice} onChange={e => setFormInv(p => ({ ...p, indice: e.target.value }))} className="input">
                  <option value="CDI">CDI</option>
                  <option value="IPCA">IPCA+</option>
                  <option value="Prefixado">Prefixado</option>
                  <option value="Poupança">Poupança</option>
                  <option value="">Sem índice</option>
                </select>
              </Field>
              <Field label={formInv.indice === 'CDI' ? '% do CDI (ex: 110)' : formInv.indice === 'IPCA' ? 'Spread % a.a.' : '% a.a.'}>
                <input value={formInv.rentabilidade_pct} onChange={e => setFormInv(p => ({ ...p, rentabilidade_pct: e.target.value }))}
                  className="input" placeholder={formInv.indice === 'CDI' ? '110' : '13.5'} />
              </Field>
            </div>
            {formInv.indice === 'CDI' && formInv.rentabilidade_pct && (
              <p className="text-xs text-muted bg-surface rounded-lg px-3 py-2">
                Taxa efetiva: {((parseFloat(formInv.rentabilidade_pct || 0) / 100) * parseFloat(config?.cdi_atual || 13.75)).toFixed(2)}% a.a.
                (CDI base: {config?.cdi_atual || 13.75}%)
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL FIXA ── */}
      {modal === 'fixa' && (
        <Modal title="Nova Conta Fixa" onClose={() => setModal(null)}>
          <form onSubmit={criarFixa} className="space-y-4">
            <Field label="Nome da conta">
              <input value={formFixa.nome} onChange={e => setFormFixa(p => ({ ...p, nome: e.target.value }))}
                className="input" placeholder="Ex: Aluguel, Netflix, Academia..." required autoFocus />
            </Field>
            <Field label="Valor mensal (R$)">
              <input value={formFixa.valor} onChange={e => setFormFixa(p => ({ ...p, valor: e.target.value }))}
                className="input" placeholder="0,00" required />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL CONFIG ── */}
      {modal === 'config' && (
        <Modal title="Salário, Meta & CDI" onClose={() => setModal(null)}>
          <form onSubmit={salvarConfig} className="space-y-4">
            <Field label="Salário Fixo (R$)">
              <input value={formConfig.salario_fixo} onChange={e => setFormConfig(p => ({ ...p, salario_fixo: e.target.value }))}
                className="input" placeholder="Ex: 5000" required autoFocus />
            </Field>
            <Field label="Meta de Investimento (ex: 0.20 = 20%)">
              <input value={formConfig.meta_investimento_pct} onChange={e => setFormConfig(p => ({ ...p, meta_investimento_pct: e.target.value }))}
                className="input" placeholder="0.20" required />
            </Field>
            <Field label="Taxa CDI atual (% a.a.) — atualizar quando Copom mudar">
              <input value={formConfig.cdi_atual} onChange={e => setFormConfig(p => ({ ...p, cdi_atual: e.target.value }))}
                className="input" placeholder="13.75" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
