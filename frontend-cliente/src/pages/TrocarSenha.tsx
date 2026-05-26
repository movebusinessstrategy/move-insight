import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

interface TrocarSenhaProps {
  cliente: Cliente;
}

export default function TrocarSenha({ cliente }: TrocarSenhaProps) {
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem');
      return;
    }

    if (novaSenha.length < 6) {
      setError('Nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cliente/auth/trocar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
        setTimeout(() => {
          navigate('/relatorio', { replace: true });
        }, 1500);
      } else {
        setError(data.error || 'Erro ao alterar senha');
      }
    } catch (_error) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/cliente/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login', { replace: true });
    } catch (_error) {
      console.error('Erro ao fazer logout');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Trocar Senha</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
        <p>
          <strong>⚠️ Atenção:</strong> Você precisa alterar sua senha antes de acessar seus relatórios.
        </p>
      </div>

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee', borderRadius: '4px', color: '#c33' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#efe', borderRadius: '4px', color: '#3c3' }}>
          ✓ Senha alterada com sucesso! Redirecionando...
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Senha Atual</label>
          <input
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1,
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Nova Senha</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1,
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Confirmar Senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              opacity: loading ? 0.6 : 1,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Alterando...' : 'Atualizar Senha'}
        </button>
      </form>
    </div>
  );
}
