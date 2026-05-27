import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Zap, LogOut, LayoutDashboard, FileText, Lightbulb } from 'lucide-react';
import type { Cliente } from '../Router';

interface ResumoCliente {
  totalSpend: number;
  totalCliques: number;
  totalConversasIniciadasMensagem: number;
  totalCampanhas: number;
  periodo: string;
}

interface CampanhaCliente {
  id: string;
  nome: string;
  status: string;
  spend: number;
  cliques: number;
  conversasIniciadasMensagem: number;
  taxa_conversao: number;
  ctr: number;
}

interface DashboardData {
  resumo: ResumoCliente;
  campanhas: CampanhaCliente[];
  periodo: string;
}

export default function Dashboard({ cliente }: { cliente: Cliente }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState('last_7d');

  useEffect(() => {
    fetchDashboardData();
  }, [periodo]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cliente/dashboard/resumo?periodo=${periodo}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao carregar dashboard');
      }

      const data = await response.json() as DashboardData;
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
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
      window.location.href = '/login';
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const periodLabels: Record<string, string> = {
    last_7d: 'Últimos 7 dias',
    last_30d: 'Últimos 30 dias',
    last_90d: 'Últimos 90 dias',
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>MOVE Insights - Dashboard</h1>
          <p style={styles.subtitle}>Olá, {cliente.cliente_nome}!</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            ...styles.logoutBtn,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}>
        <a href="/dashboard" style={{
          padding: '8px 16px',
          backgroundColor: '#2563eb',
          color: 'white',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <LayoutDashboard size={16} />
          Dashboard
        </a>
        <a href="/contexto" style={{
          padding: '8px 16px',
          backgroundColor: '#f0f0f0',
          color: '#333',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <FileText size={16} />
          Contexto
        </a>
        <a href="/criativos" style={{
          padding: '8px 16px',
          backgroundColor: '#f0f0f0',
          color: '#333',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Lightbulb size={16} />
          Ideias
        </a>
        <a href="/relatorio" style={{
          padding: '8px 16px',
          backgroundColor: '#f0f0f0',
          color: '#333',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <BarChart3 size={16} />
          Relatório
        </a>
      </div>

      {/* Period Selector */}
      <div style={styles.periodSelector}>
        {Object.entries(periodLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriodo(key)}
            style={{
              ...styles.periodBtn,
              ...(periodo === key ? styles.periodBtnActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>Carregando dados...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : dashboard ? (
        <>
          {/* Summary Cards */}
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <Zap size={24} style={{ color: '#ff9800' }} />
                <span style={styles.cardTitle}>Investimento</span>
              </div>
              <div style={styles.cardValue}>{formatCurrency(dashboard.resumo.totalSpend)}</div>
              <div style={styles.cardLabel}>Gasto Total</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <BarChart3 size={24} style={{ color: '#2196f3' }} />
                <span style={styles.cardTitle}>Cliques</span>
              </div>
              <div style={styles.cardValue}>{formatNumber(dashboard.resumo.totalCliques)}</div>
              <div style={styles.cardLabel}>Cliques Totais</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <MessageSquare size={24} style={{ color: '#4caf50' }} />
                <span style={styles.cardTitle}>Conversas</span>
              </div>
              <div style={styles.cardValue}>
                {formatNumber(dashboard.resumo.totalConversasIniciadasMensagem)}
              </div>
              <div style={styles.cardLabel}>Conversas Iniciadas</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <TrendingUp size={24} style={{ color: '#9c27b0' }} />
                <span style={styles.cardTitle}>Campanhas</span>
              </div>
              <div style={styles.cardValue}>{dashboard.resumo.totalCampanhas}</div>
              <div style={styles.cardLabel}>Total de Campanhas</div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div style={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BarChart3 size={20} style={{ color: '#2563eb' }} />
              <h2 style={styles.sectionTitle}>Campanhas Ativas</h2>
            </div>

            {dashboard.campanhas.length === 0 ? (
              <div style={styles.empty}>Nenhuma campanha encontrada para este período.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Campanha</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Investimento</th>
                      <th style={styles.th}>Cliques</th>
                      <th style={styles.th}>CTR</th>
                      <th style={styles.th}>Conversas</th>
                      <th style={styles.th}>Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.campanhas.map((campanha) => (
                      <tr key={campanha.id} style={styles.tableRow}>
                        <td style={{ ...styles.td, fontWeight: '500' }}>{campanha.nome}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: campanha.status === 'ACTIVE' ? '#e8f5e9' : '#f5f5f5',
                              color: campanha.status === 'ACTIVE' ? '#2e7d32' : '#666',
                              fontWeight: '500',
                            }}
                          >
                            {campanha.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </span>
                        </td>
                        <td style={styles.td}>{formatCurrency(campanha.spend)}</td>
                        <td style={styles.td}>{formatNumber(campanha.cliques)}</td>
                        <td style={styles.td}>{formatPercentage(campanha.ctr)}</td>
                        <td style={styles.td}>
                          <span style={{ color: '#4caf50', fontWeight: '500' }}>
                            {formatNumber(campanha.conversasIniciadasMensagem)}
                          </span>
                        </td>
                        <td style={styles.td}>{formatPercentage(campanha.taxa_conversao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div style={styles.footer}>
            <p>
              ℹ️ Os dados mostrados referem-se ao período de <strong>{periodLabels[periodo]}</strong>. Atualizações
              ocorrem a cada 24 horas.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
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
    margin: 0,
  } as React.CSSProperties,

  logoutBtn: {
    padding: '10px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  periodSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  } as React.CSSProperties,

  periodBtn: {
    padding: '8px 16px',
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  periodBtnActive: {
    backgroundColor: '#1a73e8',
    color: 'white',
    borderColor: '#1a73e8',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  } as React.CSSProperties,

  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #eee',
  } as React.CSSProperties,

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '8px',
  } as React.CSSProperties,

  cardLabel: {
    fontSize: '12px',
    color: '#999',
  } as React.CSSProperties,

  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '24px',
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1a1a1a',
  } as React.CSSProperties,

  tableWrapper: {
    overflowX: 'auto' as const,
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  } as React.CSSProperties,

  tableHeader: {
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd',
  } as React.CSSProperties,

  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: '#666',
    fontSize: '12px',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  tableRow: {
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  td: {
    padding: '12px 16px',
    color: '#333',
  } as React.CSSProperties,

  empty: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#999',
    fontSize: '14px',
  } as React.CSSProperties,

  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '16px',
  } as React.CSSProperties,

  error: {
    padding: '16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '24px',
  } as React.CSSProperties,

  footer: {
    backgroundColor: '#e3f2fd',
    padding: '16px',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#1565c0',
    marginTop: '24px',
  } as React.CSSProperties,
};
