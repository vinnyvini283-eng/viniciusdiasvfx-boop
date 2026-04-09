export default function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 text-muted">
        {icon || (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-text-2 mb-1">{title}</p>
      <p className="text-xs text-muted max-w-xs mb-4">{subtitle || 'Registre pelo Telegram ou clique em + Novo'}</p>
      {action && (
        <button onClick={onAction} className="btn-primary text-xs px-4 py-2">
          {action}
        </button>
      )}
    </div>
  )
}
