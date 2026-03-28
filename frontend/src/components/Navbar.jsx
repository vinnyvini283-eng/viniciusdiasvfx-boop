import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, List, TrendingUp, ArrowDownUp, Briefcase, LogOut } from 'lucide-react'

const links = [
  { to: '/',            label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/lancamentos', label: 'Lançamentos',   icon: List },
  { to: '/entradas',    label: 'Entradas',      icon: TrendingUp },
  { to: '/investimentos', label: 'Investimentos', icon: ArrowDownUp },
  { to: '/work',        label: 'Work',          icon: Briefcase },
]

export default function Navbar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-20">
      <div className="px-5 py-6 border-b border-border">
        <span className="text-accent font-bold text-lg tracking-tight">VinBot</span>
        <p className="text-muted text-xs mt-0.5">Assistente Pessoal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Navegação principal">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-text hover:bg-card'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-card transition-colors duration-200 cursor-pointer w-full"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </aside>
  )
}
