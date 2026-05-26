import { useNavigate } from 'react-router-dom';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

interface RelatorioProps {
  cliente: Cliente;
}

export default function Relatorio({ cliente }: RelatorioProps) {
  const navigate = useNavigate();

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
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Meus Relatórios</h1>
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

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p>
          <strong>Bem-vindo, {cliente.cliente_nome}!</strong>
        </p>
        <p style={{ marginTop: '8px', color: '#666' }}>Email: {cliente.email}</p>
        <p style={{ marginTop: '8px', color: '#666' }}>Cliente ID: {cliente.cliente_id}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '4px', color: '#0066cc' }}>
        <p>Seus relatórios de Meta Ads serão exibidos aqui em Sprint 2</p>
      </div>
    </div>
  );
}
