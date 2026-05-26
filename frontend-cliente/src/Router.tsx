import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrocarSenha from './pages/TrocarSenha';
import Relatorio from './pages/Relatorio';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

interface ProtectedRouteProps {
  cliente: Cliente | null;
  loading: boolean;
  children: React.ReactNode;
}

function ProtectedRoute({ cliente, loading, children }: ProtectedRouteProps) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>;
  }
  if (!cliente) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function Router() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/cliente/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCliente(data.cliente);
        }
      } catch (_error) {
        // Sem sessão, continua com cliente null
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={cliente ? <Navigate to="/relatorio" replace /> : <Login />} />
        <Route
          path="/trocar-senha"
          element={
            <ProtectedRoute cliente={cliente} loading={loading}>
              <TrocarSenha cliente={cliente!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorio"
          element={
            <ProtectedRoute cliente={cliente} loading={loading}>
              <Relatorio cliente={cliente!} />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/relatorio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
