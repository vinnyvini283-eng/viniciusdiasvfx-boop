import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Lancamentos from './pages/Lancamentos'
import Entradas from './pages/Entradas'
import Investimentos from './pages/Investimentos'
import Work from './pages/Work'

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Navbar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/lancamentos" element={
            <ProtectedRoute>
              <Layout><Lancamentos /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/entradas" element={
            <ProtectedRoute>
              <Layout><Entradas /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/investimentos" element={
            <ProtectedRoute>
              <Layout><Investimentos /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/work" element={
            <ProtectedRoute>
              <Layout><Work /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
