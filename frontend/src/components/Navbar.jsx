import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, Wallet, BarChart2, Briefcase, CheckSquare, TrendingUp, LogOut, Settings } from 'lucide-react'

const contabil = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/financeiro',   label: 'Financeiro',   icon: Wallet },
  { to: '/relatorios',   label: 'Relatórios',   icon: BarChart2 },
  { to: '/configuracoes',label: 'Configurações',icon: Settings },
]

const trabalho = [
  { to: '/work',            label: 'Dashboard', icon: Briefcase, end: true },
  { to: '/work/tarefas',    label: 'Tarefas',   icon: CheckSquare },
  { to: '/work/relatorios', label: 'Relatórios',icon: TrendingUp },
]

function NavItem({ to, label, icon: Icon, end, compact, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
          isActive ? 'text-white' : 'text-muted hover:text-text'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isActive ? 'bg-accent/20' : 'group-hover:bg-card'
            }`}
            style={isActive ? { boxShadow: '0 0 12px rgba(249,115,22,0.3)' } : {}}
          >
            <Icon size={15} className={isActive ? 'text-accent' : ''} />
          </div>
          <span className={`transition-all duration-200 ${compact ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'} whitespace-nowrap`}>
            {label}
          </span>
          {isActive && !compact && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"
              style={{ boxShadow: '0 0 8px rgba(249,115,22,1)' }} />
          )}
        </>
      )}
    </NavLink>
  )
}

function NavSection({ label, links, compact, onClose }) {
  return (
    <div className="mb-2">
      {!compact && (
        <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-2">{label}</p>
      )}
      {links.map(({ to, label: lbl, icon, end }) => (
        <NavItem key={to} to={to} label={lbl} icon={icon} end={end} compact={compact} onClose={onClose} />
      ))}
    </div>
  )
}

export default function Navbar({ open, onClose }) {
  const { signOut, session } = useAuth()
  const navigate = useNavigate()
  const email = session?.user?.email || ''
  const initial = email ? email[0].toUpperCase() : 'U'
  const emailShort = email.length > 22 ? email.slice(0, 22) + '…' : email

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Sidebar — hidden on mobile, always visible on md+ */}
      <aside
        className="hidden md:flex md:flex-col fixed left-0 top-0 h-full z-40 transition-all duration-200 group/sidebar w-14 hover:w-56 lg:w-56"
        style={{ background: '#0D0D0F', borderRight: '1px solid #1F1F23' }}
      >
        {/* Logo */}
        <div className="px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 0 14px rgba(249,115,22,0.5)' }}>
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <div className={`transition-all duration-200 overflow-hidden ${
              'md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto lg:opacity-100 lg:w-auto'
            }`}>
              <span className="text-gradient-accent font-bold text-base tracking-tight whitespace-nowrap">VinBot</span>
              <div className="flex items-center gap-1.5">
                <span className="status-dot status-dot-active" />
                <span className="text-muted text-xs">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 divider" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden" aria-label="Navegação principal">
          {/* Compact: hide section labels on md, show on hover or lg */}
          <div className="md:opacity-100">
            <NavSection label="Contábil" links={contabil} onClose={onClose}
              compact={false} />
            <div className="mx-1 divider my-3" />
            <NavSection label="Trabalho" links={trabalho} onClose={onClose}
              compact={false} />
          </div>
        </nav>

        <div className="mx-4 divider" />

        {/* User profile footer */}
        <div className="px-3 py-4 space-y-2">
          <div className={`flex items-center gap-3 px-2 py-2 overflow-hidden`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
              {initial}
            </div>
            <div className={`transition-all duration-200 min-w-0 overflow-hidden
              md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto lg:opacity-100 lg:w-auto`}>
              <p className="text-xs text-text-2 truncate whitespace-nowrap">{emailShort}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-negative transition-all duration-200 cursor-pointer w-full group"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-negative/10 transition-colors flex-shrink-0">
              <LogOut size={15} />
            </div>
            <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap
              md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto lg:opacity-100 lg:w-auto`}>
              Sair
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
