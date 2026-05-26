import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login', { replace: true });
    } catch (_error) {
      console.error('Erro ao fazer logout');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard Admin</h1>
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
          <strong>Bem-vindo, {user.nome}!</strong>
        </p>
        <p style={{ marginTop: '8px', color: '#666' }}>Email: {user.email}</p>
        <p style={{ marginTop: '8px', color: '#666' }}>Role: {user.role}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '4px', color: '#0066cc' }}>
        <p>Dashboard será implementado completamente na Sprint 2</p>
      </div>
    </div>
  );
}
