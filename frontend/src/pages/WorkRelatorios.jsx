import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'

const COLORS = ['#F97316','#FB923C','#FDBA74','#FED7AA','#FEF3C7','#10B981','#3B82F6']

function fmt(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

const TABS = ['Receita', 'Tarefas', 'Evolução']

export default function WorkRelatorios() {
  const [tab, setTab] = useState('Receita')
  const [loading, setLoading] = useState(true)
  const [receitaCliente, setReceitaCliente] = useState([])
  const [tarefasStatus, setTarefasStatus] = useState([])
  const [tarefasCliente, setTarefasCliente] = useState([])
  const [evolucao, setEvolucao] = useState([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const uid = user.id

      const [pagRes, tarefasRes, clientesRes] = await Promise.all([
        supabase.from('pagamentos_clientes').select('valor, data, cliente_id, clientes(nome)').eq('user_id', uid),
        supabase.from('tarefas').select('feito, status, cliente_id, clientes(nome), criado_em').eq('user_id', uid),
        supabase.from('clientes').select('id, nome').eq('user_id', uid),
      ])

      const pagamentos = pagRes.data || []
      const tarefas = tarefasRes.data || []

      // Receita por cliente
      const porCliente = {}
      for (const p of pagamentos) {
        const nome = p.clientes?.nome || 'Sem cliente'
        porCliente[nome] = (porCliente[nome] || 0) + Number(p.valor || 0)
      }
      setReceitaCliente(
        Object.entries(porCliente)
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor)
      )

      // Status das tarefas
      const concluidas = tarefas.filter(t => t.feito).length
      const pendentes = tarefas.filter(t => !t.feito).length
      setTarefasStatus([
        { name: 'Concluídas', value: concluidas },
        { name: 'Pendentes', value: pendentes },
      ])

      // Tarefas por cliente
      const porClienteTarefas = {}
      for (const t of tarefas) {
        const nome = t.clientes?.nome || 'Sem cliente'
        if (!porClienteTarefas[nome]) porClienteTarefas[nome] = { total: 0, feitas: 0 }
        porClienteTarefas[nome].total++
        if (t.feito) porClienteTarefas[nome].feitas++
      }
      setTarefasCliente(
        Object.entries(porClienteTarefas)
          .map(([nome, v]) => ({ nome, total: v.total, feitas: v.feitas, pendentes: v.total - v.feitas }))
          .sort((a, b) => b.total - a.total)
      )

      // Evolução mensal de receita (últimos 6 meses)
      const meses = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        meses[key] = { mes: label, receita: 0 }
      }
      for (const p of pagamentos) {
        const key = (p.data || '').slice(0, 7)
        if (meses[key]) meses[key].receita += Number(p.valor || 0)
      }
      setEvolucao(Object.values(meses))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-muted text-sm p-8">Carregando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Relatórios — Trabalho</h1>
        <p className="text-muted text-sm mt-1">Receita, tarefas e performance por cliente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-accent text-white' : 'text-muted hover:text-text'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Receita por cliente */}
      {tab === 'Receita' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Receita por cliente</h3>
            {receitaCliente.length === 0 ? (
              <p className="text-muted text-sm">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-3">
                {receitaCliente.map((c, i) => {
                  const max = receitaCliente[0]?.valor || 1
                  const pct = Math.round((c.valor / max) * 100)
                  return (
                    <div key={c.nome}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text">{c.nome}</span>
                        <span className="text-accent font-medium">{fmt(c.valor)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Gráfico de receita</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={receitaCliente} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }}
                  tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fill: '#A1A1AA', fontSize: 12 }} width={80} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {receitaCliente.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tarefas */}
      {tab === 'Tarefas' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Status geral</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tarefasStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80} paddingAngle={3}>
                  <Cell fill="#10B981" />
                  <Cell fill="#F97316" />
                </Pie>
                <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Tarefas por cliente</h3>
            <div className="space-y-3">
              {tarefasCliente.map(c => (
                <div key={c.nome}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text">{c.nome}</span>
                    <span className="text-muted">{c.feitas}/{c.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-positive transition-all"
                      style={{ width: `${c.total > 0 ? Math.round((c.feitas/c.total)*100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evolução */}
      {tab === 'Evolução' && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Receita mensal (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolucao}>
              <XAxis dataKey="mes" tick={{ fill: '#71717A', fontSize: 12 }} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `R$${v/1000}k`} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8 }} />
              <Bar dataKey="receita" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
