import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import { Menu } from 'lucide-react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'
import Work from './pages/Work'
import WorkDashboard from './pages/WorkDashboard'
import WorkRelatorios from './pages/WorkRelatorios'
import Onboarding from './pages/Onboarding'
import Configuracoes from './pages/Configuracoes'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="flex min-h-screen bg-bg relative">
      <div className="page-glow" />
      <Navbar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Hamburger — visible only on mobile */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-text transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>
      <main className="flex-1 p-6 pt-16 md:pt-6 overflow-auto ml-0 md:ml-14 lg:ml-56 relative z-10">
        <div className="max-w-5xl mx-auto animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}

function P({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* CONTÁBIL */}
          <Route path="/" element={<P><Dashboard /></P>} />
          <Route path="/financeiro" element={<P><Financeiro /></P>} />
          <Route path="/relatorios" element={<P><Relatorios /></P>} />

          {/* TRABALHO */}
          <Route path="/work" element={<P><WorkDashboard /></P>} />
          <Route path="/work/tarefas" element={<P><Work /></P>} />
          <Route path="/work/relatorios" element={<P><WorkRelatorios /></P>} />

          {/* Onboarding & Configurações */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/configuracoes" element={<P><Configuracoes /></P>} />

          {/* Legacy redirects */}
          <Route path="/lancamentos" element={<Navigate to="/financeiro" replace />} />
          <Route path="/entradas" element={<Navigate to="/financeiro" replace />} />
          <Route path="/investimentos" element={<Navigate to="/financeiro" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
