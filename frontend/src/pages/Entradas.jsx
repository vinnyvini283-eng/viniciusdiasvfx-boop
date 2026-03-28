import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Entradas() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano] = useState(now.getFullYear())
  const [rows, setRows] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [ents, cfg] = await Promise.all([
        supabase.from('entradas').select('*').eq('mes', mes).eq('ano', ano).order('data', { ascending: false }),
        supabase.from('config_financeiro').select('salario_fixo').limit(1).single(),
      ])
      setRows(ents.data || [])
      setConfig(cfg.data)
      setLoading(false)
    }
    load()
  }, [mes, ano])

  const totalFreela = rows.reduce((s, r) => s + parseFloat(r.valor), 0)
  const salario = parseFloat(config?.salario_fixo || 0)
  const totalEnt = salario + totalFreela

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Entradas</h1>
        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input w-36" aria-label="Mês">
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m} {ano}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Salário Fixo</p>
          <p className="text-2xl font-semibold text-text">{fmt(salario)}</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Freela / Extra</p>
          <p className="text-2xl font-semibold text-blue-400">{fmt(totalFreela)}</p>
          <p className="text-muted text-xs">{rows.length} registros</p>
        </div>
        <div className="card">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Total Entradas</p>
          <p className="text-2xl font-semibold text-accent">{fmt(totalEnt)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted font-medium px-5 py-3">Data</th>
              <th className="text-left text-muted font-medium px-5 py-3">Descrição</th>
              <th className="text-left text-muted font-medium px-5 py-3">Tipo</th>
              <th className="text-right text-muted font-medium px-5 py-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-muted">Nenhuma entrada registrada</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                <td className="px-5 py-3 text-muted whitespace-nowrap">
                  {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3 text-text">{r.descricao}</td>
                <td className="px-5 py-3">
                  <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{r.tipo}</span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-accent whitespace-nowrap">{fmt(r.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
