import { useState, useEffect } from 'react';
import Login from './pages/Login';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

export default function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Simular check de sessão (em produção, faria uma requisição GET /api/auth/admin/me)
    // Por enquanto, assume que se não tem sessão, mostra login
    setLoading(false);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>;
  }

  // Se não tem user, mostra login
  if (!user) {
    return <Login />;
  }

  // Se tem user e está em /login, redireciona para /dashboard
  if (currentPath === '/login' && user) {
    window.location.href = '/dashboard';
    return null;
  }

  // Placeholder para dashboard (será implementado em sprint 2)
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard Admin</h1>
      <p>Bem-vindo, {user.nome}!</p>
      <button onClick={() => window.location.href = '/api/auth/admin/logout'}>
        Logout
      </button>
      <p style={{ marginTop: '20px', color: '#666' }}>
        (Dashboard será implementado na Sprint 2)
      </p>
    </div>
  );
}
