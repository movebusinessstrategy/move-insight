import { useState, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, loading, error, logout };
}
