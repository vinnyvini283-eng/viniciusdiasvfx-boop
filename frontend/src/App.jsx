import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'
import Work from './pages/Work'
import WorkDashboard from './pages/WorkDashboard'
import WorkRelatorios from './pages/WorkRelatorios'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg relative">
      <div className="page-glow" />
      <Navbar />
      <main className="flex-1 p-6 overflow-auto ml-56 relative z-10">
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
