import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface Cliente {
  id: string;
  cliente_id: string;
  email: string;
  cliente_nome: string;
  senha_provisoria: boolean;
}

interface Campanha {
  nome: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  spend: number;
  cpm: number;
  cpc: number;
  frequencia: number;
  mensagens: number;
}

interface Relatorio {
  periodo: string;
  campanhas: Campanha[];
  resumo: {
    totalSpend: number;
    totalCliques: number;
    totalConversoes: number;
    totalMensagens: number;
    roas: number;
    cpmMedio: number;
    cpcMedio: number;
  };
}

interface RelatorioProps {
  cliente: Cliente;
}

export default function Relatorio({ cliente }: RelatorioProps) {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<'last_7d' | 'last_30d' | 'last_90d' | 'custom'>('last_7d');
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{ since: string; until: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarPercentual = (valor: number): string => {
    return valor.toFixed(2).replace('.', ',') + '%';
  };

  const fetchRelatorio = async (periodoSelected: string, customDates?: { since: string; until: string }) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/clientes/${cliente.cliente_id}/relatorio?period=${periodoSelected}`;
      if (periodoSelected === 'custom' && customDates) {
        url += `&since=${customDates.since}&until=${customDates.until}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setRelatorio(data.relatorio);
        setToastMessage('Relatório carregado com sucesso');
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setError(data.error || 'Erro ao carregar relatório');
        setToastMessage(data.error || 'Erro ao carregar relatório');
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar relatório';
      setError(errorMsg);
      setToastMessage(errorMsg);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio('last_7d');
  }, []);

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

  const handleMudarPeriodo = (novoPeriodo: 'last_7d' | 'last_30d' | 'last_90d' | 'custom') => {
    setPeriodo(novoPeriodo);
    if (novoPeriodo !== 'custom') {
      fetchRelatorio(novoPeriodo);
    }
  };

  const handleCarregarCustom = () => {
    const since = (document.getElementById('customSince') as HTMLInputElement)?.value;
    const until = (document.getElementById('customUntil') as HTMLInputElement)?.value;
    if (since && until) {
      setCustomDateRange({ since, until });
      fetchRelatorio('custom', { since, until });
    } else {
      setError('Por favor, preencha ambas as datas');
      setToastMessage('Por favor, preencha ambas as datas');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const getRotiluPeriodo = (): string => {
    switch (periodo) {
      case 'last_7d':
        return 'Últimos 7 dias';
      case 'last_30d':
        return 'Últimos 30 dias';
      case 'last_90d':
        return 'Últimos 90 dias';
      case 'custom':
        return customDateRange ? `${customDateRange.since} até ${customDateRange.until}` : 'Período customizado';
      default:
        return 'Período desconhecido';
    }
  };

  const defaultSince = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
  const defaultUntil = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            backgroundColor: error ? '#dc3545' : '#28a745',
            color: 'white',
            borderRadius: '4px',
            zIndex: 2000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>📊 Seus Relatórios de Meta Ads</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Bem-vindo, {cliente.cliente_nome}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: '25px', padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '4px', borderLeft: '4px solid #1a73e8' }}>
        <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#1a73e8' }}>Período: {getRotiluPeriodo()}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => handleMudarPeriodo('last_7d')}
            style={{
              padding: '8px 12px',
              backgroundColor: periodo === 'last_7d' ? '#1a73e8' : '#e0e0e0',
              color: periodo === 'last_7d' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: periodo === 'last_7d' ? 'bold' : '500',
            }}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => handleMudarPeriodo('last_30d')}
            style={{
              padding: '8px 12px',
              backgroundColor: periodo === 'last_30d' ? '#1a73e8' : '#e0e0e0',
              color: periodo === 'last_30d' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: periodo === 'last_30d' ? 'bold' : '500',
            }}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => handleMudarPeriodo('last_90d')}
            style={{
              padding: '8px 12px',
              backgroundColor: periodo === 'last_90d' ? '#1a73e8' : '#e0e0e0',
              color: periodo === 'last_90d' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: periodo === 'last_90d' ? 'bold' : '500',
            }}
          >
            Últimos 90 dias
          </button>
          <button
            onClick={() => handleMudarPeriodo('custom')}
            style={{
              padding: '8px 12px',
              backgroundColor: periodo === 'custom' ? '#1a73e8' : '#e0e0e0',
              color: periodo === 'custom' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: periodo === 'custom' ? 'bold' : '500',
            }}
          >
            Customizado
          </button>
        </div>

        {periodo === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Data Inicial</label>
              <input
                type="date"
                id="customSince"
                defaultValue={customDateRange?.since || defaultSince}
                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Data Final</label>
              <input
                type="date"
                id="customUntil"
                defaultValue={customDateRange?.until || defaultUntil}
                style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleCarregarCustom}
              style={{
                padding: '6px 12px',
                backgroundColor: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              🔄 Carregar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #e0e0e0',
                borderTop: '4px solid #1a73e8',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: '12px', color: '#666' }}>Carregando relatório...</p>
          </div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : error && !relatorio ? (
        <div style={{ padding: '20px', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24', border: '1px solid #f5c6cb' }}>
          <p style={{ margin: 0 }}>❌ {error}</p>
        </div>
      ) : relatorio ? (
        <>
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>💰 Resumo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Spend</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>
                  {formatarMoeda(relatorio.resumo.totalSpend)}
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Cliques</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>
                  {relatorio.resumo.totalCliques.toLocaleString('pt-BR')}
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Conversões</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {relatorio.resumo.totalConversoes.toLocaleString('pt-BR')}
                </p>
              </div>
              <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: '500' }}>ROAS</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {relatorio.resumo.roas.toFixed(2)}x
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>📱 Campanhas</h3>
            {relatorio.campanhas.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', padding: '16px', backgroundColor: 'white', borderRadius: '4px' }}>
                Nenhuma campanha encontrada
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Nome</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Impressões</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Cliques</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>CTR</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Conversões</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>Spend</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>CPM</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.campanhas.map((campanha: Campanha, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#333', fontWeight: '500' }}>{campanha.nome}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{campanha.impressoes.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{campanha.cliques.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{formatarPercentual(campanha.ctr)}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{campanha.conversoes.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{formatarMoeda(campanha.spend)}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{formatarMoeda(campanha.cpm)}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#666', textAlign: 'right' }}>{formatarMoeda(campanha.cpc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
