import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  status: string;
  report_frequency: string;
  billing_reminder_active: boolean;
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const response = await fetch('/api/admin/clientes', {
          credentials: 'include',
        });
        const data = await response.json();
        if (response.ok) {
          setClientes(data.clientes);
        } else {
          setError(data.error || 'Erro ao carregar clientes');
        }
      } catch (_error) {
        setError('Erro ao conectar com servidor');
      } finally {
        setLoading(false);
      }
    };

    loadClientes();
  }, []);

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

  const handleLembrarPagamento = async (clienteId: string) => {
    setReminderLoading(clienteId);
    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}/lembrar-pagamento`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        alert('Lembrete de pagamento disparado com sucesso!');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (_error) {
      alert('Erro ao enviar lembrete');
    } finally {
      setReminderLoading(null);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>Dashboard - Gestão Financeira</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Bem-vindo, {user.nome}!</p>
        </div>
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

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', borderRadius: '4px', color: '#c33', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando clientes...</div>
      ) : clientes.length === 0 ? (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
          Nenhum cliente cadastrado
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Valor Mensal</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Vencimento</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <strong>{cliente.nome}</strong>
                  </td>
                  <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>{cliente.email}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {cliente.valor_mensal ? `R$ ${cliente.valor_mensal.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {cliente.dia_vencimento ? `Dia ${cliente.dia_vencimento}` : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: cliente.status === 'ativo' ? '#efe' : '#fee',
                        color: cliente.status === 'ativo' ? '#3c3' : '#c33',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {cliente.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleLembrarPagamento(cliente.id)}
                      disabled={reminderLoading === cliente.id || !cliente.billing_reminder_active}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: cliente.billing_reminder_active ? '#1a73e8' : '#999',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: cliente.billing_reminder_active ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        opacity: reminderLoading === cliente.id ? 0.6 : 1,
                      }}
                    >
                      {reminderLoading === cliente.id ? '...' : '💬 Lembrar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '4px', color: '#0066cc' }}>
        <p>
          <strong>💡 Dica:</strong> Clique no botão "Lembrar" para enviar uma mensagem via WhatsApp ao cliente sobre seu pagamento. O lembrete
          só funciona se o cliente tiver WhatsApp cadastrado e o aviso estiver ativado.
        </p>
      </div>
    </div>
  );
}
