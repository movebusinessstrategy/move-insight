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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar mudança de senha em Sprint 2
    console.log('Trocar senha será implementado em Sprint 2');
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

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Senha Atual</label>
          <input type="password" disabled style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Nova Senha</label>
          <input type="password" disabled style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Confirmar Senha</label>
          <input type="password" disabled style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>

        <button
          type="submit"
          disabled
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'not-allowed',
            fontSize: '16px',
            opacity: 0.6,
          }}
        >
          Atualizar Senha
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '4px', color: '#0066cc' }}>
        <p>
          <strong>Nota:</strong> Esta página será completamente implementada em Sprint 2. Por enquanto, você pode pular esta etapa ou testar com
          uma página diferente.
        </p>
      </div>
    </div>
  );
}
