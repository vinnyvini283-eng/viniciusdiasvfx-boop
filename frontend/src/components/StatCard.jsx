export default function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  const valueClass = color || 'value-gradient'

  return (
    <div className="card card-glow flex flex-col gap-3 hover:shadow-card-hover transition-all duration-300 cursor-default">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-medium uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon size={14} className="text-accent" />
          </div>
        )}
      </div>
      <span className={`text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</span>
      {(sub || trend !== undefined) && (
        <div className="flex items-center justify-between">
          {sub && <span className="text-text-2 text-xs">{sub}</span>}
          {trend !== undefined && (
            <span className={`text-xs font-medium ${trend >= 0 ? 'text-positive' : 'text-negative'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
