export default function BarraProgresso({ pct = 0, label, showValue = true }) {
  const cor =
    pct < 50 ? 'bg-red-500' :
    pct < 80 ? 'bg-yellow-500' :
    'bg-green-500'

  const corText =
    pct < 50 ? 'text-red-400' :
    pct < 80 ? 'text-yellow-400' :
    'text-green-400'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-muted">{label}</span>}
          {showValue && (
            <span className={`text-xs font-semibold ${corText}`}>
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
