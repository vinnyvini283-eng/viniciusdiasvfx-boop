import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, PieChart as PieIcon, BarChart2, Users } from 'lucide-react'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtShort = (v) => {
  if (v >= 1000) return `R$${(v/1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

const TABS = [
  { id: 'evolucao',    label: 'Evolução',   icon: TrendingUp },
  { id: 'categorias',  label: 'Categorias', icon: PieIcon },
  { id: 'investimentos', label: 'Investimentos', icon: BarChart2 },
  { id: 'clientes',    label: 'Clientes',   icon: Users },
]

export default function Relatorios() {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [tab, setTab] = useState('evolucao')
  const [loading, setLoading] = useState(true)

  // evolução mensal
  const [evolucao, setEvolucao] = useState([])
  // categorias no ano
  const [categorias, setCategorias] = useState([])
  // investimentos por mês
  const [invMes, setInvMes] = useState([])
  // pagamentos por cliente
  const [clientes, setClientes] = useState([])

  const loadEvolucao = useCallback(async () => {
    const inicio = `${ano}-01-01`
    const fim = `${ano}-12-31`

    const [lans, ents, invs, cfgRes] = await Promise.all([
      supabase.from('lancamentos').select('valor,data,mes').gte('data', inicio).lte('data', fim),
      supabase.from('entradas').select('valor,mes').eq('ano', ano),
      supabase.from('investimentos').select('valor,mes').eq('ano', ano),
      supabase.from('config_financeiro').select('salario_fixo').limit(1).single(),
    ])

    const salario = parseFloat(cfgRes.data?.salario_fixo || 0)
    const mesMap = {}
    for (let m = 1; m <= 12; m++) {
      mesMap[m] = { mes: MONTHS[m-1], gastos: 0, entradas: salario, investido: 0 }
    }

    ;(lans.data || []).forEach(l => {
      const m = new Date(l.data + 'T00:00:00').getMonth() + 1
      if (mesMap[m]) mesMap[m].gastos += parseFloat(l.valor)
    })
    ;(ents.data || []).forEach(e => {
      if (mesMap[e.mes]) mesMap[e.mes].entradas += parseFloat(e.valor)
    })
    ;(invs.data || []).forEach(i => {
      if (mesMap[i.mes]) mesMap[i.mes].investido += parseFloat(i.valor)
    })

    setEvolucao(Object.values(mesMap))
  }, [ano])

  const loadCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('lancamentos')
      .select('categoria,valor')
      .eq('ano', ano)

    const catMap = {}
    ;(data || []).forEach(l => {
      catMap[l.categoria] = (catMap[l.categoria] || 0) + parseFloat(l.valor)
    })
    setCategorias(
      Object.entries(catMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    )
  }, [ano])

  const loadInvestimentos = useCallback(async () => {
    const { data } = await supabase
      .from('investimentos')
      .select('valor,mes,descricao')
      .eq('ano', ano)

    const mesMap = {}
    for (let m = 1; m <= 12; m++) mesMap[m] = { mes: MONTHS[m-1], total: 0 }
    ;(data || []).forEach(i => {
      if (mesMap[i.mes]) mesMap[i.mes].total += parseFloat(i.valor)
    })
    setInvMes(Object.values(mesMap))
  }, [ano])

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from('pagamentos_clientes')
      .select('valor, clientes(nome)')

    const cliMap = {}
    ;(data || []).forEach(p => {
      const nome = p.clientes?.nome || 'Desconhecido'
      cliMap[nome] = (cliMap[nome] || 0) + parseFloat(p.valor)
    })
    setClientes(
      Object.entries(cliMap)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total)
    )
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadEvolucao(), loadCategorias(), loadInvestimentos(), loadClientes()])
      setLoading(false)
    }
    load()
  }, [loadEvolucao, loadCategorias, loadInvestimentos, loadClientes])

  const tooltipStyle = {
    background: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '12px',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Relatórios</h1>
          <p className="text-muted text-sm">Análise anual — {ano}</p>
        </div>
        <select
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          className="input w-28"
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Evolução Mensal */}
          {tab === 'evolucao' && (
            <div className="card">
              <h2 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Evolução Mensal {ano}</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={evolucao} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmt(v), n]} />
                  <Legend formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>} />
                  <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#22C55E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="investido" name="Investido" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* Tabela resumo */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted font-medium">Mês</th>
                      <th className="text-right py-2 text-muted font-medium">Entradas</th>
                      <th className="text-right py-2 text-muted font-medium">Gastos</th>
                      <th className="text-right py-2 text-muted font-medium">Investido</th>
                      <th className="text-right py-2 text-muted font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evolucao.map(row => {
                      const saldo = row.entradas - row.gastos - row.investido
                      return (
                        <tr key={row.mes} className="border-b border-border/50 hover:bg-surface/50">
                          <td className="py-2 text-text font-medium">{row.mes}</td>
                          <td className="py-2 text-right text-accent">{fmt(row.entradas)}</td>
                          <td className="py-2 text-right text-red-400">{fmt(row.gastos)}</td>
                          <td className="py-2 text-right text-purple-400">{fmt(row.investido)}</td>
                          <td className={`py-2 text-right font-semibold ${saldo >= 0 ? 'text-accent' : 'text-red-400'}`}>
                            {fmt(saldo)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Categorias */}
          {tab === 'categorias' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">Distribuição por Categoria</h2>
                {categorias.length === 0 ? (
                  <p className="text-muted text-sm text-center py-16">Nenhum dado disponível</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categorias} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                        {categorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card">
                <h2 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">Ranking de Gastos</h2>
                {categorias.length === 0 ? (
                  <p className="text-muted text-sm text-center py-16">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {categorias.map((cat, i) => {
                      const total = categorias.reduce((s, c) => s + c.value, 0)
                      const pct = total > 0 ? (cat.value / total * 100) : 0
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-text font-medium">{cat.name}</span>
                            <span className="text-muted">{fmt(cat.value)} · {pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Investimentos */}
          {tab === 'investimentos' && (
            <div className="card">
              <h2 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Investimentos por Mês — {ano}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invMes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v), 'Investido']} />
                  <Bar dataKey="total" name="Investido" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 p-4 bg-surface rounded-xl border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted text-sm">Total investido em {ano}</span>
                  <span className="text-purple-400 font-bold text-lg">
                    {fmt(invMes.reduce((s, m) => s + m.total, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clientes */}
          {tab === 'clientes' && (
            <div className="card">
              <h2 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">Receita por Cliente</h2>
              {clientes.length === 0 ? (
                <p className="text-muted text-sm text-center py-16">Nenhum pagamento registrado</p>
              ) : (
                <>
                  <div className="mb-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={clientes} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <YAxis type="category" dataKey="nome" tick={{ fill: '#94A3B8', fontSize: 12 }} width={60} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v), 'Recebido']} />
                        <Bar dataKey="total" fill="#22C55E" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted font-medium">Cliente</th>
                        <th className="text-right py-2 text-muted font-medium">Total Recebido</th>
                        <th className="text-right py-2 text-muted font-medium">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map(c => {
                        const total = clientes.reduce((s, x) => s + x.total, 0)
                        const pct = total > 0 ? (c.total / total * 100) : 0
                        return (
                          <tr key={c.nome} className="border-b border-border/50 hover:bg-surface/50">
                            <td className="py-2 text-text font-medium">{c.nome}</td>
                            <td className="py-2 text-right text-accent font-semibold">{fmt(c.total)}</td>
                            <td className="py-2 text-right text-muted">{pct.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-2 text-muted font-medium">Total</td>
                        <td className="py-2 text-right text-accent font-bold">
                          {fmt(clientes.reduce((s, c) => s + c.total, 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
