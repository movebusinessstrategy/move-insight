import { useState } from 'react';
import type { FormEvent } from 'react';

interface LoginFormData {
  email: string;
  senha: string;
}

interface LoginError {
  message: string;
}

interface ClienteData {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/cliente/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const data = (await response.json()) as {
        token: string;
        cliente: ClienteData;
      };

      // Armazenar token no localStorage
      localStorage.setItem('cliente_token', data.token);
      localStorage.setItem('cliente_data', JSON.stringify(data.cliente));

      // Redirecionar para dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>MOVE Insights</h1>
        <p style={styles.subtitle}>Portal do Cliente</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.group}>
            <label style={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              value={formData.senha}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && <div style={styles.error}>{error.message}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={styles.footer}>
          © 2026 MOVE Business. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
  } as React.CSSProperties,
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#1a1a1a',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 32px 0',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  } as React.CSSProperties,
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  } as React.CSSProperties,
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  error: {
    padding: '10px 12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '14px',
  } as React.CSSProperties,
  button: {
    padding: '12px 16px',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  footer: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '24px',
    margin: '24px 0 0 0',
  } as React.CSSProperties,
};
