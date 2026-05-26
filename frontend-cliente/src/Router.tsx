import { useState, useEffect } from 'react';
import Login from './pages/Login';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

export default function Router() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Simular check de sessão (em produção, faria uma requisição GET /api/cliente/auth/me)
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

  // Se não tem cliente, mostra login
  if (!cliente) {
    return <Login />;
  }

  // Se cliente precisa mudar senha
  if (cliente.senha_provisoria && currentPath !== '/trocar-senha') {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Trocar Senha</h1>
        <p>Você precisa alterar sua senha antes de continuar.</p>
        <p style={{ marginTop: '20px', color: '#666' }}>
          (Página de trocar senha será implementada na Sprint 2)
        </p>
      </div>
    );
  }

  // Se tem cliente, mostra relatório
  if (currentPath === '/login' && cliente) {
    window.location.href = '/relatorio';
    return null;
  }

  // Placeholder para relatório (será implementado em sprint 2)
  return (
    <div style={{ padding: '20px' }}>
      <h1>Meus Relatórios</h1>
      <p>Bem-vindo, {cliente.cliente_nome}!</p>
      <button onClick={() => window.location.href = '/api/cliente/auth/logout'}>
        Logout
      </button>
      <p style={{ marginTop: '20px', color: '#666' }}>
        (Relatórios será implementado na Sprint 2)
      </p>
    </div>
  );
}
