import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Investimentos() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano] = useState(now.getFullYear())
  const [rows, setRows] = useState([])
  const [config, setConfig] = useState(null)
  const [totalEnt, setTotalEnt] = useState(0)
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [invs, cfg, ents, salCfg, allInvs] = await Promise.all([
        supabase.from('investimentos').select('*').eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
        supabase.from('config_financeiro').select('*').limit(1).single(),
        supabase.from('entradas').select('valor').eq('mes', mes).eq('ano', ano),
        supabase.from('config_financeiro').select('salario_fixo').limit(1).single(),
        supabase.from('investimentos').select('valor, mes').eq('ano', ano),
      ])

      const salario = parseFloat(salCfg.data?.salario_fixo || 0)
      const freela = (ents.data || []).reduce((s, r) => s + parseFloat(r.valor), 0)
      setTotalEnt(salario + freela)
      setRows(invs.data || [])
      setConfig(cfg.data)

      const byMes = {}
      ;(allInvs.data || []).forEach(r => {
        byMes[r.mes] = (byMes[r.mes] || 0) + parseFloat(r.valor)
      })
      setMonthlyData(MONTHS.map((m, i) => ({ mes: m, valor: byMes[i + 1] || 0 })))
      setLoading(false)
    }
    load()
  }, [mes, ano])

  const totalInv = rows.reduce((s, r) => s + parseFloat(r.valor), 0)
  const metaPct = parseFloat(config?.meta_investimento_pct || 0.20)
  const metaValor = totalEnt * metaPct
  const pctAtingida = metaValor > 0 ? Math.min((totalInv / metaValor) * 100, 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Investimentos</h1>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input w-36" aria-label="Mês">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m} {ano}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Investido</p>
          <p className="text-2xl font-semibold text-purple-400">{fmt(totalInv)}</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Meta ({(metaPct * 100).toFixed(0)}%)</p>
          <p className="text-2xl font-semibold text-yellow-400">{fmt(metaValor)}</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Progresso</p>
          <p className={`text-2xl font-semibold ${pctAtingida >= 100 ? 'text-accent' : 'text-orange-400'}`}>
            {pctAtingida.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted text-xs uppercase tracking-wider">Meta do Mês</span>
          <span className="text-sm font-medium text-text">{fmt(totalInv)} / {fmt(metaValor)}</span>
        </div>
        <div className="h-2.5 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctAtingida >= 100 ? 'bg-accent' : 'bg-yellow-400'}`}
            style={{ width: `${pctAtingida}%` }}
          />
        </div>
        {pctAtingida >= 100 && (
          <p className="text-accent text-xs mt-2 font-medium">Meta atingida! Parabéns.</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">Evolução {ano}</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="mes" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
              {monthlyData.map((_, i) => <Cell key={i} fill={i === mes - 1 ? '#8B5CF6' : '#334155'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted font-medium px-5 py-3">Data</th>
              <th className="text-left text-muted font-medium px-5 py-3">Descrição</th>
              <th className="text-right text-muted font-medium px-5 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 text-muted">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-muted">Nenhum investimento este mês</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                <td className="px-5 py-3 text-muted whitespace-nowrap">
                  {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-text">{r.descricao}</td>
                <td className="px-5 py-3 text-right font-medium text-purple-400 whitespace-nowrap">{fmt(r.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
