import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClienteDashboard from './pages/ClienteDashboard';
import RelatorioClienteDashboard from './pages/RelatorioClienteDashboard';
import FinanceiroDashboard from './pages/FinanceiroDashboard';
import FornecedoresPage from './pages/FornecedoresPage';
import ContasPagarPage from './pages/ContasPagarPage';
import ReceitasEsporadicasPage from './pages/ReceitasEsporadicasPage';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

interface ProtectedRouteProps {
  user: User | null;
  loading: boolean;
  children: React.ReactNode;
}

function ProtectedRoute({ user, loading, children }: ProtectedRouteProps) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/admin/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (_error) {
        // Sem sessão, continua com user null
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Dashboard user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorio"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <RelatorioClienteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/cliente/:clienteId"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ClienteDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FinanceiroDashboard user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fornecedores"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <FornecedoresPage user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contas-pagar"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ContasPagarPage user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receitas-esporadicas"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <ReceitasEsporadicasPage user={user!} />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
