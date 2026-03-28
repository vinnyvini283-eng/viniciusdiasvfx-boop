import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2, CheckCircle2, Circle } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Work() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tasks')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [tasksRes, clientsRes, docsRes] = await Promise.all([
        supabase.from('work_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('work_clients').select('*').order('nome'),
        supabase.from('work_docs').select('*').order('created_at', { ascending: false }),
      ])
      setTasks(tasksRes.data || [])
      setClients(clientsRes.data || [])
      setDocs(docsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleTask = async (task) => {
    const done = !task.done
    await supabase.from('work_tasks').update({ done }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done } : t))
  }

  const deleteTask = async (id) => {
    if (!confirm('Excluir tarefa?')) return
    await supabase.from('work_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
  const totalReceivable = clients.reduce((s, c) => s + parseFloat(c.valor_mensal || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Work</h1>
        <div className="flex gap-1 bg-surface rounded-lg p-1">
          {['tasks', 'clients', 'docs'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-card text-text' : 'text-muted hover:text-text'
              }`}
            >
              {t === 'tasks' ? 'Tarefas' : t === 'clients' ? 'Clientes' : 'Docs'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Pendentes</p>
              <p className="text-2xl font-semibold text-yellow-400">{pending.length}</p>
            </div>
            <div className="card">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Concluídas</p>
              <p className="text-2xl font-semibold text-accent">{done.length}</p>
            </div>
            <div className="card">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-semibold text-text">{tasks.length}</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            {loading ? (
              <p className="text-center py-12 text-muted text-sm">Carregando...</p>
            ) : tasks.length === 0 ? (
              <p className="text-center py-12 text-muted text-sm">Nenhuma tarefa registrada</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map(t => (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3 hover:bg-surface/50 transition-colors">
                    <button onClick={() => toggleTask(t)} className="mt-0.5 flex-shrink-0 text-muted hover:text-accent transition-colors">
                      {t.done ? <CheckCircle2 size={18} className="text-accent" /> : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.done ? 'line-through text-muted' : 'text-text'}`}>{t.titulo}</p>
                      {t.cliente && <p className="text-xs text-muted mt-0.5">{t.cliente}</p>}
                      {t.prazo && (
                        <p className="text-xs text-muted mt-0.5">
                          Prazo: {new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    {t.prioridade && (
                      <span className={`badge text-xs flex-shrink-0 ${
                        t.prioridade === 'alta' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        t.prioridade === 'media' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-surface text-muted border-border'
                      }`}>
                        {t.prioridade}
                      </span>
                    )}
                    <button onClick={() => deleteTask(t.id)} className="text-muted hover:text-red-400 transition-colors flex-shrink-0 ml-1">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'clients' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Clientes Ativos</p>
              <p className="text-2xl font-semibold text-blue-400">{clients.length}</p>
            </div>
            <div className="card">
              <p className="text-muted text-xs uppercase tracking-wider mb-1">Receita Mensal</p>
              <p className="text-2xl font-semibold text-accent">{fmt(totalReceivable)}</p>
            </div>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted font-medium px-5 py-3">Cliente</th>
                  <th className="text-left text-muted font-medium px-5 py-3">Contato</th>
                  <th className="text-right text-muted font-medium px-5 py-3">Valor/mês</th>
                  <th className="text-left text-muted font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted">Carregando...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted">Nenhum cliente cadastrado</td></tr>
                ) : clients.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-3 text-text font-medium">{c.nome}</td>
                    <td className="px-5 py-3 text-muted">{c.contato || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-accent">{fmt(c.valor_mensal)}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${c.ativo ? 'bg-accent/10 text-accent border-accent/20' : 'bg-surface text-muted border-border'}`}>
                        {c.ativo ? 'ativo' : 'inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted font-medium px-5 py-3">Título</th>
                <th className="text-left text-muted font-medium px-5 py-3">Tipo</th>
                <th className="text-left text-muted font-medium px-5 py-3">Cliente</th>
                <th className="text-left text-muted font-medium px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-muted">Carregando...</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-muted">Nenhum documento registrado</td></tr>
              ) : docs.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                  <td className="px-5 py-3 text-text font-medium">{d.titulo}</td>
                  <td className="px-5 py-3">
                    <span className="badge bg-surface text-muted border-border">{d.tipo || 'doc'}</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{d.cliente || '—'}</td>
                  <td className="px-5 py-3 text-muted whitespace-nowrap">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
