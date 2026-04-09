import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import BarraProgresso from '../components/BarraProgresso'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Target } from 'lucide-react'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Dashboard() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [cfg, fixas, lans, ents, invs] = await Promise.all([
        supabase.from('config_financeiro').select('*').limit(1).single(),
        supabase.from('despesas_fixas').select('*').eq('mes', mes).eq('ano', ano).maybeSingle(),
        supabase.from('lancamentos').select('*').eq('mes', mes).eq('ano', ano),
        supabase.from('entradas').select('*').eq('mes', mes).eq('ano', ano),
        supabase.from('investimentos').select('valor').eq('mes', mes).eq('ano', ano),
      ])

      const salario = parseFloat(cfg.data?.salario_fixo || 0)
      const freela = (ents.data || []).reduce((s, r) => s + parseFloat(r.valor), 0)
      const totalEnt = salario + freela

      const fixasRow = fixas.data || {}
      const fixasCols = ['aluguel','condominio','energia','agua','internet_telefone','plano_saude','seguro','mensalidade']
      const totalFix = fixasCols.reduce((s, k) => s + parseFloat(fixasRow[k] || 0), 0)

      const lansData = lans.data || []
      const totalVar = lansData.reduce((s, r) => s + parseFloat(r.valor), 0)
      const totalInv = (invs.data || []).reduce((s, r) => s + parseFloat(r.valor), 0)
      const saldo = totalEnt - totalFix - totalVar - totalInv
      const metaInv = totalEnt * parseFloat(cfg.data?.meta_investimento_pct || 0.20)
      const pctMeta = metaInv > 0 ? (totalInv / metaInv * 100) : 0

      const catMap = {}
      lansData.forEach(l => {
        catMap[l.categoria] = (catMap[l.categoria] || 0) + parseFloat(l.valor)
      })
      const cats = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

      setData({ salario, freela, totalEnt, totalFix, totalVar, totalInv, saldo, metaInv, pctMeta })
      setCategorias(cats)
      setLancamentos(lansData.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5))
      setLoading(false)
    }
    load()
  }, [mes, ano])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text tracking-tight">Visão Geral</h1>
          <p className="text-text-2 text-sm">{MONTHS[mes - 1]} {ano}</p>
        </div>
        <select
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
          className="input w-36"
          aria-label="Selecionar mês"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m} {ano}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Saldo" value={fmt(data.saldo)} icon={Wallet}
          color={data.saldo >= 0 ? 'value-positive' : 'value-negative'}
          sub={`Entradas: ${fmt(data.totalEnt)}`} />
        <StatCard label="Gastos Variáveis" value={fmt(data.totalVar)} icon={TrendingDown}
          color="value-negative" sub={`${categorias.length} categorias`} />
        <StatCard label="Despesas Fixas" value={fmt(data.totalFix)} icon={TrendingDown}
          color="text-warning" />
        <StatCard label="Freela / Extra" value={fmt(data.freela)} icon={TrendingUp}
          color="text-gradient-accent" sub={`Salário: ${fmt(data.salario)}`} />
        <StatCard label="Investido" value={fmt(data.totalInv)} icon={PiggyBank}
          color="text-accent2"
          sub={`Meta: ${fmt(data.metaInv)}`} />
        <div className="card flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
              <Target size={15} className="text-muted" />
            </div>
            <p className="text-xs text-muted uppercase tracking-widest">Meta Invest.</p>
          </div>
          <BarraProgresso pct={data.pctMeta} />
          <p className="text-xs text-muted">
            {data.pctMeta >= 100 ? '✓ Meta atingida!' : `Faltam ${fmt(data.metaInv - data.totalInv)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-xs font-semibold text-muted mb-4 uppercase tracking-widest">Gastos por Categoria</h2>
          {categorias.length === 0 ? (
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>}
              title="Nenhum gasto este mês"
              subtitle="Registre pelo Telegram: 'gastei 50 no mercado'"
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categorias} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {categorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-xs font-semibold text-muted mb-4 uppercase tracking-widest">Últimos Lançamentos</h2>
          {lancamentos.length === 0 ? (
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>}
              title="Nenhum lançamento ainda"
              subtitle="Registre pelo Telegram ou clique em + Novo"
            />
          ) : (
            <div className="space-y-3">
              {lancamentos.map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text">{l.descricao}</p>
                    <p className="text-xs text-muted">{l.categoria} · {new Date(l.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-400">{fmt(l.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
