import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Wallet, BarChart2, Briefcase, Settings } from 'lucide-react'

const tabs = [
  { to: '/',              label: 'Início',    icon: LayoutDashboard, end: true },
  { to: '/financeiro',    label: 'Finanças',  icon: Wallet },
  { to: '/relatorios',    label: 'Relatórios',icon: BarChart2 },
  { to: '/work',          label: 'Work',      icon: Briefcase, end: true },
  { to: '/configuracoes', label: 'Config',    icon: Settings },
]

export default function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(13,13,15,0.96)',
        borderTop: '1px solid #27272A',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 transition-colors active:opacity-60 ${
              isActive ? 'text-accent' : 'text-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-10 h-7 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  isActive ? 'bg-accent/15' : ''
                }`}
                style={isActive ? { boxShadow: '0 0 10px rgba(249,115,22,0.25)' } : {}}
              >
                <Icon size={19} />
              </div>
              <span className="text-[10px] font-medium tracking-tight leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
