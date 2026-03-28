import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Trash2 } from 'lucide-react'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CATS = ['Todas','Alimentação','Transporte','Lazer','Vestuário','Saúde','Educação','Outros']
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const PAGE = 20

export default function Lancamentos() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano] = useState(now.getFullYear())
  const [cat, setCat] = useState('Todas')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const load = async () => {
    setLoading(true)
    let q = supabase.from('lancamentos').select('*', { count: 'exact' })
      .eq('mes', mes).eq('ano', ano).order('data', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (cat !== 'Todas') q = q.eq('categoria', cat)
    const { data, count } = await q
    setRows(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  useEffect(() => { setPage(0) }, [mes, cat])
  useEffect(() => { load() }, [mes, cat, page])

  const handleDelete = async (id) => {
    if (!confirm('Excluir lançamento?')) return
    await supabase.from('lancamentos').delete().eq('id', id)
    load()
  }

  const totalRows = rows.reduce((s, r) => s + parseFloat(r.valor), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-text">Lançamentos</h1>

      <div className="flex flex-wrap gap-3">
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input w-36" aria-label="Mês">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m} {ano}</option>)}
        </select>
        <select value={cat} onChange={e => setCat(e.target.value)} className="input w-40" aria-label="Categoria">
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted text-sm">{total} registros</span>
          <span className="font-semibold text-red-400">{fmt(totalRows)}</span>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted font-medium px-5 py-3">Data</th>
              <th className="text-left text-muted font-medium px-5 py-3">Descrição</th>
              <th className="text-left text-muted font-medium px-5 py-3">Categoria</th>
              <th className="text-right text-muted font-medium px-5 py-3">Valor</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted">Nenhum lançamento</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                <td className="px-5 py-3 text-muted whitespace-nowrap">
                  {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-text">{r.descricao}</td>
                <td className="px-5 py-3">
                  <span className="badge bg-surface text-muted border border-border">{r.categoria}</span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-red-400 whitespace-nowrap">{fmt(r.valor)}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => handleDelete(r.id)} className="text-muted hover:text-red-400 transition-colors cursor-pointer" aria-label="Excluir">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE && (
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost">Anterior</button>
          <span className="text-muted">Página {page + 1} de {Math.ceil(total / PAGE)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE >= total} className="btn-ghost">Próxima</button>
        </div>
      )}
    </div>
  )
}
