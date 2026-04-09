import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { Trash2, CheckCircle2, Circle, Plus, ExternalLink } from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const today = () => new Date().toISOString().split('T')[0]

const TABS = [
  { id: 'tasks',    label: 'Tarefas' },
  { id: 'clients',  label: 'Clientes' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'docs',     label: 'Docs' },
]

export default function Work() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [payments, setPayments] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tasks')
  const [modal, setModal] = useState(null) // 'task' | 'client' | 'payment' | 'doc'
  const [saving, setSaving] = useState(false)

  const [formTask, setFormTask] = useState({ nome: '', descricao: '', cliente_id: '', data_limite: '', status: 'A Fazer' })
  const [formClient, setFormClient] = useState({ nome: '', email: '', telefone: '' })
  const [formPayment, setFormPayment] = useState({ cliente_id: '', valor: '', descricao: '', data: today() })
  const [formDoc, setFormDoc] = useState({ nome: '', url: '', cliente_id: '' })

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser()
    return data.user?.id
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [tasksRes, clientsRes, paymentsRes, docsRes] = await Promise.all([
      supabase.from('tarefas').select('*, clientes(nome)').order('criado_em', { ascending: false }),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('pagamentos_clientes').select('*, clientes(nome)').order('data', { ascending: false }),
      supabase.from('documentos').select('*, clientes(nome)').order('criado_em', { ascending: false }),
    ])
    setTasks(tasksRes.data || [])
    setClients(clientsRes.data || [])
    setPayments(paymentsRes.data || [])
    setDocs(docsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleTask = async (task) => {
    const feito = !task.feito
    await supabase.from('tarefas').update({ feito, status: feito ? 'Concluído' : 'A Fazer' }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, feito, status: feito ? 'Concluído' : 'A Fazer' } : t))
  }

  const deleteTask = async (id) => {
    if (!confirm('Excluir tarefa?')) return
    await supabase.from('tarefas').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const deleteClient = async (id) => {
    if (!confirm('Excluir cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
  }

  const deletePayment = async (id) => {
    if (!confirm('Excluir pagamento?')) return
    await supabase.from('pagamentos_clientes').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const deleteDoc = async (id) => {
    if (!confirm('Excluir documento?')) return
    await supabase.from('documentos').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  // ── CRIAR ──

  const criarTask = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const { data, error } = await supabase.from('tarefas').insert({
      user_id: userId,
      nome: formTask.nome,
      descricao: formTask.descricao || null,
      cliente_id: formTask.cliente_id || null,
      data_limite: formTask.data_limite || null,
      status: formTask.status,
      feito: false,
    }).select('*, clientes(nome)').single()
    setSaving(false)
    if (!error) {
      setTasks(prev => [data, ...prev])
      setFormTask({ nome: '', descricao: '', cliente_id: '', data_limite: '', status: 'A Fazer' })
      setModal(null)
    }
  }

  const criarClient = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const { data, error } = await supabase.from('clientes').insert({
      user_id: userId,
      nome: formClient.nome,
      email: formClient.email || null,
      telefone: formClient.telefone || null,
      ativo: true,
    }).select().single()
    setSaving(false)
    if (!error) {
      setClients(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setFormClient({ nome: '', email: '', telefone: '' })
      setModal(null)
    }
  }

  const criarPayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const val = parseFloat(String(formPayment.valor).replace(',', '.'))
    const { data, error } = await supabase.from('pagamentos_clientes').insert({
      user_id: userId,
      cliente_id: formPayment.cliente_id,
      valor: val,
      descricao: formPayment.descricao || null,
      data: formPayment.data,
    }).select('*, clientes(nome)').single()
    setSaving(false)
    if (!error) {
      setPayments(prev => [data, ...prev])
      setFormPayment({ cliente_id: '', valor: '', descricao: '', data: today() })
      setModal(null)
    }
  }

  const criarDoc = async (e) => {
    e.preventDefault()
    setSaving(true)
    const userId = await getUserId()
    const { data, error } = await supabase.from('documentos').insert({
      user_id: userId,
      nome: formDoc.nome,
      url: formDoc.url || null,
      cliente_id: formDoc.cliente_id || null,
    }).select('*, clientes(nome)').single()
    setSaving(false)
    if (!error) {
      setDocs(prev => [data, ...prev])
      setFormDoc({ nome: '', url: '', cliente_id: '' })
      setModal(null)
    }
  }

  const pending = tasks.filter(t => !t.feito)
  const done = tasks.filter(t => t.feito)
  const activeClients = clients.filter(c => c.ativo)
  const totalRecebido = payments.reduce((s, p) => s + parseFloat(p.valor), 0)

  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text tracking-tight">Work</h1>
          <p className="text-text-2 text-sm">{activeClients.length} clientes · {pending.length} pendentes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 ${
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
          {/* ── TAREFAS ── */}
          {tab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Pendentes</p>
                    <p className="text-2xl font-semibold text-warning">{pending.length}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Concluídas</p>
                    <p className="text-2xl font-semibold value-positive">{done.length}</p></div>
                  <div className="card"><p className="text-muted text-xs uppercase tracking-widest mb-1">Total</p>
                    <p className="text-2xl font-semibold text-text">{tasks.length}</p></div>
                </div>
                <button onClick={() => setModal('task')} className="btn-primary flex items-center gap-1.5 self-start">
                  <Plus size={15} /> Nova
                </button>
              </div>

              <div className="card p-0 overflow-hidden">
                {tasks.length === 0 ? (
                  <EmptyState
                    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>}
                    title="Nenhuma tarefa ainda"
                    subtitle="Registre pelo Telegram: 'nova tarefa GSPNEUS: relatório até sexta'"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {tasks.map(t => (
                      <li key={t.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface/40 transition-colors">
                        <button onClick={() => toggleTask(t)} className="mt-0.5 flex-shrink-0 cursor-pointer">
                          {t.feito
                            ? <CheckCircle2 size={18} className="text-accent" />
                            : <Circle size={18} className="text-muted hover:text-accent transition-colors" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${t.feito ? 'line-through text-muted' : 'text-text'}`}>{t.nome}</p>
                          {t.clientes?.nome && <p className="text-xs text-text-2 mt-0.5">{t.clientes.nome}</p>}
                          {t.data_limite && (
                            <p className="text-xs text-text-2 mt-0.5">
                              Prazo: {new Date(t.data_limite + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <span className={`badge text-xs flex-shrink-0 ${
                          t.status === 'Em Andamento' ? 'bg-warning/10 text-warning' :
                          t.status === 'Concluído' ? 'bg-positive/10 text-positive' :
                          'bg-surface text-muted border border-border'}`}>
                          {t.status || 'A Fazer'}
                        </span>
                        <button onClick={() => deleteTask(t.id)} className="text-muted hover:text-negative transition-colors cursor-pointer flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── CLIENTES ── */}
          {tab === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="card flex-1 mr-3">
                  <p className="text-muted text-xs uppercase tracking-widest mb-1">Clientes Ativos</p>
                  <p className="text-2xl font-semibold text-gradient-accent">{activeClients.length}</p>
                </div>
                <button onClick={() => setModal('client')} className="btn-primary flex items-center gap-1.5">
                  <Plus size={15} /> Novo
                </button>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Cliente</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Telefone</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-16 text-muted">Nenhum cliente cadastrado</td></tr>
                    ) : clients.map(c => (
                      <tr key={c.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-5 py-3 text-text font-medium">{c.nome}</td>
                        <td className="px-5 py-3 text-text-2">{c.email || '—'}</td>
                        <td className="px-5 py-3 text-text-2">{c.telefone || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`badge text-xs ${c.ativo ? 'bg-positive/10 text-positive' : 'bg-surface text-muted border border-border'}`}>
                            {c.ativo ? 'ativo' : 'inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => deleteClient(c.id)} className="text-muted hover:text-negative transition-colors cursor-pointer">
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

          {/* ── PAGAMENTOS ── */}
          {tab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="card flex-1 mr-3">
                  <p className="text-muted text-xs uppercase tracking-widest mb-1">Total Recebido</p>
                  <p className="text-2xl font-semibold value-positive">{fmt(totalRecebido)}</p>
                </div>
                <button onClick={() => setModal('payment')} className="btn-primary flex items-center gap-1.5">
                  <Plus size={15} /> Novo
                </button>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Data</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Cliente</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Descrição</th>
                      <th className="text-right text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Valor</th>
                      <th className="px-5 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-16 text-muted">Nenhum pagamento registrado</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-5 py-3 text-text-2 text-xs whitespace-nowrap">
                          {p.data ? new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-3 text-text font-medium">{p.clientes?.nome || '—'}</td>
                        <td className="px-5 py-3 text-text-2">{p.descricao || '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold value-positive">{fmt(p.valor)}</td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => deletePayment(p.id)} className="text-muted hover:text-negative transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-border bg-surface/20">
                        <td colSpan={3} className="px-5 py-2.5 text-xs text-muted">{payments.length} registros</td>
                        <td className="px-5 py-2.5 text-right font-bold value-positive">{fmt(totalRecebido)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ── DOCS ── */}
          {tab === 'docs' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setModal('doc')} className="btn-primary flex items-center gap-1.5">
                  <Plus size={15} /> Novo Doc
                </button>
              </div>
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Documento</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Cliente</th>
                      <th className="text-left text-muted font-medium px-5 py-3 text-xs uppercase tracking-wider">Link</th>
                      <th className="px-5 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {docs.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-16 text-muted">Nenhum documento registrado</td></tr>
                    ) : docs.map(d => (
                      <tr key={d.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                        <td className="px-5 py-3 text-text font-medium">{d.nome}</td>
                        <td className="px-5 py-3 text-text-2">{d.clientes?.nome || '—'}</td>
                        <td className="px-5 py-3">
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                              className="text-accent hover:text-accent2 flex items-center gap-1 text-xs transition-colors">
                              <ExternalLink size={12} /> Abrir
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button onClick={() => deleteDoc(d.id)} className="text-muted hover:text-negative transition-colors cursor-pointer">
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
        </>
      )}

      {/* ── MODAL TAREFA ── */}
      {modal === 'task' && (
        <Modal title="Nova Tarefa" onClose={() => setModal(null)}>
          <form onSubmit={criarTask} className="space-y-4">
            <Field label="Nome da tarefa">
              <input value={formTask.nome} onChange={e => setFormTask(p => ({ ...p, nome: e.target.value }))}
                className="input" placeholder="Ex: Revisar proposta do cliente X" required autoFocus />
            </Field>
            <Field label="Descrição (opcional)">
              <textarea value={formTask.descricao} onChange={e => setFormTask(p => ({ ...p, descricao: e.target.value }))}
                className="input resize-none" rows={2} placeholder="Detalhes..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cliente (opcional)">
                <select value={formTask.cliente_id} onChange={e => setFormTask(p => ({ ...p, cliente_id: e.target.value }))} className="input">
                  <option value="">— Nenhum —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={formTask.status} onChange={e => setFormTask(p => ({ ...p, status: e.target.value }))} className="input">
                  <option value="A Fazer">A Fazer</option>
                  <option value="Em Andamento">Em Andamento</option>
                </select>
              </Field>
            </div>
            <Field label="Prazo (opcional)">
              <input value={formTask.data_limite} onChange={e => setFormTask(p => ({ ...p, data_limite: e.target.value }))}
                className="input" type="date" />
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

      {/* ── MODAL CLIENTE ── */}
      {modal === 'client' && (
        <Modal title="Novo Cliente" onClose={() => setModal(null)}>
          <form onSubmit={criarClient} className="space-y-4">
            <Field label="Nome">
              <input value={formClient.nome} onChange={e => setFormClient(p => ({ ...p, nome: e.target.value }))}
                className="input" placeholder="Nome do cliente" required autoFocus />
            </Field>
            <Field label="Email (opcional)">
              <input value={formClient.email} onChange={e => setFormClient(p => ({ ...p, email: e.target.value }))}
                className="input" type="email" placeholder="cliente@email.com" />
            </Field>
            <Field label="Telefone (opcional)">
              <input value={formClient.telefone} onChange={e => setFormClient(p => ({ ...p, telefone: e.target.value }))}
                className="input" placeholder="(11) 99999-9999" />
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

      {/* ── MODAL PAGAMENTO ── */}
      {modal === 'payment' && (
        <Modal title="Registrar Pagamento" onClose={() => setModal(null)}>
          <form onSubmit={criarPayment} className="space-y-4">
            <Field label="Cliente">
              <select value={formPayment.cliente_id} onChange={e => setFormPayment(p => ({ ...p, cliente_id: e.target.value }))}
                className="input" required autoFocus>
                <option value="">Selecione o cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)">
                <input value={formPayment.valor} onChange={e => setFormPayment(p => ({ ...p, valor: e.target.value }))}
                  className="input" placeholder="0,00" required />
              </Field>
              <Field label="Data">
                <input value={formPayment.data} onChange={e => setFormPayment(p => ({ ...p, data: e.target.value }))}
                  className="input" type="date" required />
              </Field>
            </div>
            <Field label="Descrição (opcional)">
              <input value={formPayment.descricao} onChange={e => setFormPayment(p => ({ ...p, descricao: e.target.value }))}
                className="input" placeholder="Ex: Projeto site, Mês de março..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL DOC ── */}
      {modal === 'doc' && (
        <Modal title="Novo Documento" onClose={() => setModal(null)}>
          <form onSubmit={criarDoc} className="space-y-4">
            <Field label="Nome">
              <input value={formDoc.nome} onChange={e => setFormDoc(p => ({ ...p, nome: e.target.value }))}
                className="input" placeholder="Ex: Contrato, Proposta..." required autoFocus />
            </Field>
            <Field label="Link (opcional)">
              <input value={formDoc.url} onChange={e => setFormDoc(p => ({ ...p, url: e.target.value }))}
                className="input" placeholder="https://..." type="url" />
            </Field>
            <Field label="Cliente (opcional)">
              <select value={formDoc.cliente_id} onChange={e => setFormDoc(p => ({ ...p, cliente_id: e.target.value }))} className="input">
                <option value="">— Nenhum —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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
    </div>
  )
}
