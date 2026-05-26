import { useState, useCallback } from 'react';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

interface UseAuthReturn {
  cliente: Cliente | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/cliente/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setCliente(null);
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  }, []);

  return { cliente, loading, error, logout };
}
