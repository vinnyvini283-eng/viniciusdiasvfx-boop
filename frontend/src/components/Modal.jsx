import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border z-10"
        style={{ boxShadow: '0 0 40px rgba(249,115,22,0.08), 0 25px 50px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
