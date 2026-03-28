export default function StatCard({ label, value, sub, color = 'text-text', icon: Icon }) {
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={15} className="text-muted" />}
      </div>
      <span className={`text-2xl font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-muted text-xs">{sub}</span>}
    </div>
  )
}
