import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import { CheckSquare, Clock, Users, DollarSign, AlertTriangle } from 'lucide-react'

function fmt(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function dataBR(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function diffDias(iso) {
  if (!iso) return null
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const alvo = new Date(iso + 'T00:00:00')
  return Math.round((alvo - hoje) / 86400000)
}

export default function WorkDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pendentes: 0, hoje: 0, atrasadas: 0, clientes: 0, receitaMes: 0 })
  const [tarefasHoje, setTarefasHoje] = useState([])
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState([])
  const [proximasTarefas, setProximasTarefas] = useState([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const uid = user.id
      const hoje = new Date().toISOString().split('T')[0]

      const [tarefasRes, clientesRes, pagRes] = await Promise.all([
        supabase.from('tarefas').select('*, clientes(nome)').eq('user_id', uid).eq('feito', false),
        supabase.from('clientes').select('id').eq('user_id', uid),
        supabase.from('pagamentos_clientes').select('valor, data').eq('user_id', uid)
          .gte('data', hoje.slice(0, 7) + '-01'),
      ])

      const tarefas = tarefasRes.data || []
      const hojeTarefas = tarefas.filter(t => t.data_limite === hoje)
      const atrasadas = tarefas.filter(t => t.data_limite && t.data_limite < hoje)
      const proximas = tarefas
        .filter(t => t.data_limite && t.data_limite > hoje)
        .sort((a, b) => a.data_limite.localeCompare(b.data_limite))
        .slice(0, 5)

      const receitaMes = (pagRes.data || []).reduce((s, p) => s + Number(p.valor || 0), 0)

      setStats({
        pendentes: tarefas.length,
        hoje: hojeTarefas.length,
        atrasadas: atrasadas.length,
        clientes: (clientesRes.data || []).length,
        receitaMes,
      })
      setTarefasHoje(hojeTarefas)
      setTarefasAtrasadas(atrasadas)
      setProximasTarefas(proximas)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-muted text-sm p-8">Carregando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Trabalho</h1>
        <p className="text-muted text-sm mt-1">Visão geral das suas tarefas e clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tarefas pendentes" value={stats.pendentes} icon={CheckSquare} color="value-gradient" />
        <StatCard label="Vencem hoje" value={stats.hoje} icon={Clock}
          color={stats.hoje > 0 ? 'text-warning' : 'text-text-2'} />
        <StatCard label="Atrasadas" value={stats.atrasadas} icon={AlertTriangle}
          color={stats.atrasadas > 0 ? 'text-negative' : 'text-text-2'} />
        <StatCard label="Clientes" value={stats.clientes} icon={Users} color="text-text" />
      </div>

      <StatCard label="Receita este mês" value={fmt(stats.receitaMes)} icon={DollarSign} color="value-positive" />

      {/* Tarefas de hoje */}
      {tarefasHoje.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Clock size={14} className="text-warning" /> Tarefas de hoje
          </h2>
          <div className="space-y-2">
            {tarefasHoje.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-text">{t.nome}</p>
                  {t.clientes?.nome && <p className="text-xs text-muted">{t.clientes.nome}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Hoje</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atrasadas */}
      {tarefasAtrasadas.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-negative" /> Atrasadas
          </h2>
          <div className="space-y-2">
            {tarefasAtrasadas.map(t => {
              const dias = diffDias(t.data_limite)
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-text">{t.nome}</p>
                    {t.clientes?.nome && <p className="text-xs text-muted">{t.clientes.nome}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-negative/10 text-negative">
                    {Math.abs(dias)}d atraso
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Próximas */}
      {proximasTarefas.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text mb-3">Próximas tarefas</h2>
          <div className="space-y-2">
            {proximasTarefas.map(t => {
              const dias = diffDias(t.data_limite)
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-text">{t.nome}</p>
                    {t.clientes?.nome && <p className="text-xs text-muted">{t.clientes.nome}</p>}
                  </div>
                  <span className="text-xs text-muted-2">{dataBR(t.data_limite)} · {dias}d</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {stats.pendentes === 0 && (
        <div className="card p-8 text-center">
          <CheckSquare size={32} className="text-positive mx-auto mb-2 opacity-50" />
          <p className="text-muted text-sm">Nenhuma tarefa pendente. Dia livre!</p>
        </div>
      )}
    </div>
  )
}
