import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, Wallet, BarChart2, Briefcase, CheckSquare, TrendingUp, LogOut } from 'lucide-react'

const contabil = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart2 },
]

const trabalho = [
  { to: '/work',           label: 'Dashboard',  icon: Briefcase, end: true },
  { to: '/work/tarefas',   label: 'Tarefas',    icon: CheckSquare },
  { to: '/work/relatorios',label: 'Relatórios', icon: TrendingUp },
]

function NavSection({ label, links }) {
  return (
    <div className="mb-2">
      <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-2">{label}</p>
      {links.map(({ to, label: lbl, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
              isActive ? 'text-white' : 'text-muted hover:text-text'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive ? 'bg-accent/20' : 'group-hover:bg-card'
                }`}
                style={isActive ? { boxShadow: '0 0 12px rgba(249,115,22,0.3)' } : {}}
              >
                <Icon size={15} className={isActive ? 'text-accent' : ''} />
              </div>
              <span>{lbl}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"
                  style={{ boxShadow: '0 0 8px rgba(249,115,22,1)' }} />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export default function Navbar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col z-20"
      style={{ background: '#0D0D0F', borderRight: '1px solid #1F1F23' }}>

      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 0 14px rgba(249,115,22,0.5)' }}>
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <span className="text-gradient-accent font-bold text-base tracking-tight">VinBot</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 ml-9">
          <span className="status-dot status-dot-active" />
          <span className="text-muted text-xs">Online</span>
        </div>
      </div>

      <div className="mx-4 divider" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Navegação principal">
        <NavSection label="Contábil" links={contabil} />
        <div className="mx-1 divider my-3" />
        <NavSection label="Trabalho" links={trabalho} />
      </nav>

      <div className="mx-4 divider" />

      {/* Footer */}
      <div className="px-3 py-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-negative transition-all duration-200 cursor-pointer w-full group"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-negative/10 transition-colors">
            <LogOut size={15} />
          </div>
          Sair
        </button>
      </div>
    </aside>
  )
}
