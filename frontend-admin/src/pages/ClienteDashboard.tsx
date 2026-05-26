import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Campanha {
  nome: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  mensagens: number;
  spend: number;
  cpm: number;
  cpc: number;
  frequencia: number;
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

interface Fatura {
  id: string;
  cliente_id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  status: 'aberta' | 'paga' | 'atrasada' | 'cancelada';
  data_pagamento: string | null;
  observacoes: string | null;
  criada_em: string;
  atualizada_em: string;
}

interface ResumoFinanceiro {
  totalFaturado: number;
  totalRecebido: number;
  totalEmAberto: number;
  totalAtrasado: number;
  proximoVencimento: string | null;
}

interface FaturamentoMensal {
  mes: string;
  valor: number;
  recebido: number;
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
  meta_ads_account_id?: string;
  whatsapp_numero?: string;
}

type PeriodType = 'last_7d' | 'last_30d' | 'last_90d';
type TabType = 'campanhas' | 'financeiro';

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { clienteId } = useParams<{ clienteId: string }>();

  console.log('🚀 ClienteDashboard componente renderizado, clienteId:', clienteId);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiro | null>(null);
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<PeriodType>('last_7d');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('campanhas');
  const [paymentProcessing, setPaymentProcessing] = useState<string | null>(null);
  const [reminderProcessing, setReminderProcessing] = useState<string | null>(null);
  const [relatorioProcessing, setRelatorioProcessing] = useState(false);

  // Load cliente on mount
  useEffect(() => {
    const loadCliente = async () => {
      if (!clienteId) return;
      setLoading(true);
      try {
        const clienteRes = await fetch(`/api/admin/clientes/${clienteId}?_=${Date.now()}`, {
          credentials: 'include',
        });
        const clienteData = await clienteRes.json();
        if (clienteRes.ok) {
          setCliente(clienteData.cliente);
        } else {
          setError(clienteData.error || 'Erro ao carregar cliente');
        }
      } catch (_error) {
        setError('Erro ao conectar com servidor');
      } finally {
        setLoading(false);
      }
    };
    loadCliente();
  }, [clienteId]);

  // Load relatório when period or custom dates change
  useEffect(() => {
    const loadRelatorio = async () => {
      if (!clienteId || !cliente?.meta_ads_account_id) return;

      try {
        let url = `/api/admin/clientes/${clienteId}/relatorio?_=${Date.now()}`;

        console.log('📅 Construindo URL:', { useCustomDate, customDateStart, customDateEnd, period });

        if (useCustomDate && customDateStart && customDateEnd) {
          console.log('✅ Usando datas customizadas:', customDateStart, 'a', customDateEnd);
          url += `&since=${customDateStart}&until=${customDateEnd}`;
        } else {
          console.log('✅ Usando período:', period);
          url += `&period=${period}`;
        }

        console.log('🔗 URL final:', url);

        const relatorioRes = await fetch(url, {
          credentials: 'include',
        });
        const relatorioData = await relatorioRes.json();
        if (relatorioRes.ok) {
          setRelatorio(relatorioData.relatorio);
          console.log('📊 Relatório carregado:', relatorioData.relatorio.periodo);
        } else {
          console.error('❌ Erro ao carregar relatório:', relatorioData.error);
        }
      } catch (error) {
        console.error('Erro ao carregar relatório:', error);
      }
    };

    loadRelatorio();
  }, [clienteId, cliente?.meta_ads_account_id, period, customDateStart, customDateEnd, useCustomDate]);

  // Recarregar cliente quando muda de aba
  useEffect(() => {
    if (!clienteId) return;

    const reloadCliente = async () => {
      try {
        const res = await fetch(`/api/admin/clientes/${clienteId}?_=${Date.now()}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setCliente(data.cliente);
        }
      } catch (_error) {
        console.error('Erro ao recarregar cliente:', _error);
      }
    };

    reloadCliente();
  }, [activeTab, clienteId]);

  useEffect(() => {
    const loadFinancialData = async () => {
      if (!clienteId || activeTab !== 'financeiro') return;

      setFinancialLoading(true);
      try {
        const [resumoRes, faturamentoRes, faturasRes] = await Promise.all([
          fetch(`/api/admin/clientes/${clienteId}/resumo-financeiro`, { credentials: 'include' }),
          fetch(`/api/admin/clientes/${clienteId}/faturamento-mensal`, { credentials: 'include' }),
          fetch(`/api/admin/clientes/${clienteId}/faturas`, { credentials: 'include' }),
        ]);

        if (resumoRes.ok) {
          const resumoData = await resumoRes.json();
          setResumoFinanceiro(resumoData.resumo);
        }

        if (faturamentoRes.ok) {
          const faturamentoData = await faturamentoRes.json();
          setFaturamentoMensal(faturamentoData.faturamento);
        }

        if (faturasRes.ok) {
          const faturasData = await faturasRes.json();
          setFaturas(faturasData.faturas);
        }
      } catch (err) {
        console.error('Erro ao carregar dados financeiros:', err);
      } finally {
        setFinancialLoading(false);
      }
    };

    loadFinancialData();
  }, [clienteId, activeTab]);

  const handlePayment = async (faturaId: string) => {
    if (!clienteId) return;
    setPaymentProcessing(faturaId);

    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}/faturas/${faturaId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ observacoes: 'Pagamento registrado pelo admin' }),
      });

      if (res.ok) {
        setFaturas(faturas.map((f) => (f.id === faturaId ? { ...f, status: 'paga', data_pagamento: new Date().toISOString() } : f)));
        if (resumoFinanceiro) {
          const updatedFatura = faturas.find((f) => f.id === faturaId);
          if (updatedFatura) {
            setResumoFinanceiro({
              ...resumoFinanceiro,
              totalRecebido: resumoFinanceiro.totalRecebido + updatedFatura.valor,
              totalEmAberto: resumoFinanceiro.totalEmAberto - updatedFatura.valor,
            });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
    } finally {
      setPaymentProcessing(null);
    }
  };

  const handleEnviarReminderFatura = async (faturaId: string) => {
    if (!clienteId || !cliente?.whatsapp_numero) {
      alert('Número de WhatsApp não configurado para este cliente');
      return;
    }

    setReminderProcessing(faturaId);
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}/faturas/${faturaId}/enviar-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: cliente.whatsapp_numero }),
      });

      if (res.ok) {
        alert('Reminder enviado com sucesso!');
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Erro ao enviar reminder:', err);
      alert('Erro ao enviar reminder');
    } finally {
      setReminderProcessing(null);
    }
  };

  const handleEnviarRelatorioFinanceiro = async () => {
    if (!clienteId || !cliente?.whatsapp_numero) {
      alert('Número de WhatsApp não configurado para este cliente');
      return;
    }

    setRelatorioProcessing(true);
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: cliente.whatsapp_numero }),
      });

      if (res.ok) {
        alert('Relatório financeiro enviado com sucesso!');
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Erro ao enviar relatório:', err);
      alert('Erro ao enviar relatório');
    } finally {
      setRelatorioProcessing(false);
    }
  };

  const handleEnviarRelatorioCampanhas = async () => {
    if (!clienteId || !cliente?.whatsapp_numero) {
      alert('Número de WhatsApp não configurado para este cliente');
      return;
    }

    setRelatorioProcessing(true);
    try {
      const periodLabel = {
        last_7d: 'últimos 7 dias',
        last_30d: 'últimos 30 dias',
        last_90d: 'últimos 90 dias',
      }[period];

      const mensagem = `*MOVE Insights* 📊\n\n📱 Relatório de Campanhas (${periodLabel})\n\nCliente: ${cliente.nome}\n\n💰 *Resumo*\n├ Investimento: R$ ${relatorio?.resumo.totalSpend.toFixed(2) || '0.00'}\n├ Cliques: ${relatorio?.resumo.totalCliques.toLocaleString('pt-BR') || '0'}\n├ Conversões: ${relatorio?.resumo.totalConversoes.toLocaleString('pt-BR') || '0'}\n├ Mensagens: ${relatorio?.resumo.totalMensagens.toLocaleString('pt-BR') || '0'}\n└ ROAS: ${relatorio?.resumo.roas.toFixed(2) || '0.00'}x`;

      const res = await fetch(`/api/admin/clientes/${clienteId}/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numero: cliente.whatsapp_numero, mensagem }),
      });

      if (res.ok) {
        alert('Relatório de campanhas enviado com sucesso!');
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      console.error('Erro ao enviar relatório:', err);
      alert('Erro ao enviar relatório');
    } finally {
      setRelatorioProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Carregando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          ← Voltar
        </button>
        <div style={{ padding: '12px', backgroundColor: '#fee', borderRadius: '4px', color: '#c33' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Cliente não encontrado
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '12px',
              fontSize: '14px',
            }}
          >
            ← Voltar
          </button>
          <h1 style={{ marginTop: 0, marginBottom: '4px' }}>📊 Dashboard - {cliente.nome}</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>{cliente.email}</p>
        </div>
        {activeTab === 'campanhas' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginBottom: '4px' }}>
                Período
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setUseCustomDate(false);
                    setPeriod('last_7d');
                  }}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: !useCustomDate && period === 'last_7d' ? '#1a73e8' : '#f0f0f0',
                    color: !useCustomDate && period === 'last_7d' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: !useCustomDate && period === 'last_7d' ? 'bold' : 'normal',
                  }}
                >
                  7 dias
                </button>
                <button
                  onClick={() => {
                    setUseCustomDate(false);
                    setPeriod('last_30d');
                  }}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: !useCustomDate && period === 'last_30d' ? '#1a73e8' : '#f0f0f0',
                    color: !useCustomDate && period === 'last_30d' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: !useCustomDate && period === 'last_30d' ? 'bold' : 'normal',
                  }}
                >
                  30 dias
                </button>
                <button
                  onClick={() => {
                    setUseCustomDate(false);
                    setPeriod('last_90d');
                  }}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: !useCustomDate && period === 'last_90d' ? '#1a73e8' : '#f0f0f0',
                    color: !useCustomDate && period === 'last_90d' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: !useCustomDate && period === 'last_90d' ? 'bold' : 'normal',
                  }}
                >
                  90 dias
                </button>
                <button
                  onClick={() => setUseCustomDate(!useCustomDate)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: useCustomDate ? '#ff9800' : '#f0f0f0',
                    color: useCustomDate ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: useCustomDate ? 'bold' : 'normal',
                  }}
                >
                  📅 Customizado
                </button>
              </div>
              {useCustomDate && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#666' }}>De:</label>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        width: '140px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#666' }}>Até:</label>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '12px',
                        width: '140px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleEnviarRelatorioCampanhas}
              disabled={relatorioProcessing || !cliente?.whatsapp_numero}
              style={{
                padding: '10px 16px',
                backgroundColor: cliente?.whatsapp_numero ? '#4caf50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: cliente?.whatsapp_numero ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: relatorioProcessing ? 0.6 : 1,
              }}
              title={!cliente?.whatsapp_numero ? 'Configure o número de WhatsApp' : 'Enviar relatório de campanhas'}
            >
              {relatorioProcessing ? '...' : '📱 Enviar Relatório'}
            </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab('campanhas')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'campanhas' ? '#1a73e8' : 'transparent',
            color: activeTab === 'campanhas' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'campanhas' ? '3px solid #1a73e8' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'campanhas' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          📱 Campanhas
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'financeiro' ? '#1a73e8' : 'transparent',
            color: activeTab === 'financeiro' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'financeiro' ? '3px solid #1a73e8' : '3px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'financeiro' ? 'bold' : 'normal',
            transition: 'all 0.2s',
          }}
        >
          💰 Financeiro
        </button>
      </div>

      {activeTab === 'campanhas' ? (
        <>
          {!cliente.meta_ads_account_id ? (
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404', marginBottom: '20px' }}>
              ⚠️ Cliente não possui ID de conta Meta Ads configurado. Configure na página de clientes.
            </div>
          ) : !relatorio ? (
            <div style={{ padding: '20px', backgroundColor: '#e7f3ff', borderRadius: '4px', color: '#0066cc' }}>
              ℹ️ Carregando dados da Meta Ads...
            </div>
          ) : (
            <>
              {/* CARDS DE RESUMO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                💰 Investimento Total
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                R$ {relatorio.resumo.totalSpend.toFixed(2)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Gasto em publicidade</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                👁️ Visualizações (Cliques)
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#2196f3' }}>
                {relatorio.resumo.totalCliques.toLocaleString('pt-BR')}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Pessoas que clicaram</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px', border: '2px solid #9c27b0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                💬 Mensagens Iniciadas
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#9c27b0' }}>
                {relatorio.resumo.totalMensagens.toLocaleString('pt-BR')}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Conversas no WhatsApp/Messenger</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                ✅ Conversões
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                {relatorio.resumo.totalConversoes.toLocaleString('pt-BR')}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Vendas/Ações completadas</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#fce4ec', borderRadius: '8px', border: '2px solid #e91e63' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                📊 Eficiência (ROAS)
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#e91e63' }}>
                {relatorio.resumo.roas.toFixed(2)}x
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Retorno por real investido</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#f0f4c3', borderRadius: '8px', border: '2px solid #cddc39' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                💵 CPM Médio
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#9ccc65' }}>
                R$ {relatorio.resumo.cpmMedio.toFixed(2)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Custo por 1.000 impressões</p>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#c8e6c9', borderRadius: '8px', border: '2px solid #66bb6a' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                🎯 CPC Médio
              </p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#43a047' }}>
                R$ {relatorio.resumo.cpcMedio.toFixed(2)}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Custo por clique</p>
            </div>
          </div>

          {/* CAMPANHAS ATIVAS */}
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>📱 Campanhas Ativas ({relatorio.campanhas.length})</h2>
            {relatorio.campanhas.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                Nenhuma campanha encontrada
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>📱 Campanha</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>👁️ Vistos</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Cliques</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Taxa Clique</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>✅ Vend.</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>💬 Msgs</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>💵 CPM</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>🎯 CPC</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Investido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.campanhas.map((campanha, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{campanha.nome}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                          {campanha.impressoes.toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                          {campanha.cliques.toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#2196f3', fontSize: '13px', fontWeight: '500' }}>
                          {campanha.ctr.toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#4caf50', fontSize: '13px', fontWeight: '500' }}>
                          {campanha.conversoes.toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#9c27b0', fontSize: '13px', fontWeight: '500' }}>
                          {campanha.mensagens.toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                          R$ {campanha.cpm.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                          R$ {campanha.cpc.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>
                          R$ {campanha.spend.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

              {/* PERÍODO */}
              <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '4px', color: '#0066cc', fontSize: '13px' }}>
                📅 Dados do período: {relatorio.periodo}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {financialLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Carregando dados financeiros...
            </div>
          ) : (
            <>
              {/* FINANCIAL SUMMARY CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: '#fffacd', borderRadius: '8px', border: '2px solid #ffd700' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    💰 Total Faturado
                  </p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                    R$ {resumoFinanceiro?.totalFaturado.toFixed(2) || '0.00'}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Desde início de trabalhos</p>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    ✅ Total Recebido
                  </p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                    R$ {resumoFinanceiro?.totalRecebido.toFixed(2) || '0.00'}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Pagamentos confirmados</p>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    ⏳ Em Aberto
                  </p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                    R$ {resumoFinanceiro?.totalEmAberto.toFixed(2) || '0.00'}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>À receber</p>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#ffebee', borderRadius: '8px', border: '2px solid #f44336' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    ⚠️ Atrasado
                  </p>
                  <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#f44336' }}>
                    R$ {resumoFinanceiro?.totalAtrasado.toFixed(2) || '0.00'}
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Vencido não pago</p>
                </div>

                {resumoFinanceiro?.proximoVencimento && (
                  <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      📅 Próximo Vencimento
                    </p>
                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#2196f3' }}>
                      {new Date(resumoFinanceiro.proximoVencimento).toLocaleDateString('pt-BR')}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>Primeira fatura aberta</p>
                  </div>
                )}
              </div>

              {/* BOTÃO ENVIAR RELATÓRIO */}
              <div style={{ marginBottom: '30px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleEnviarRelatorioFinanceiro}
                  disabled={relatorioProcessing || !cliente?.whatsapp_numero}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: cliente?.whatsapp_numero ? '#4caf50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: cliente?.whatsapp_numero ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  {relatorioProcessing ? '📱 Enviando...' : '📱 Enviar Relatório Financeiro'}
                </button>
                {!cliente?.whatsapp_numero && (
                  <p style={{ margin: 0, color: '#f44336', fontSize: '13px', alignSelf: 'center' }}>
                    Configure o número de WhatsApp na edição do cliente
                  </p>
                )}
              </div>

              {/* MONTHLY BILLING TABLE */}
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>📊 Faturamento Mensal</h2>
                {faturamentoMensal.length === 0 ? (
                  <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                    Nenhum faturamento registrado
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>📅 Mês</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>💰 Faturado</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>✅ Recebido</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>⏳ Pendente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturamentoMensal.map((f, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>{f.mes}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ff9800' }}>
                              R$ {f.valor.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#4caf50' }}>
                              R$ {f.recebido.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: f.valor - f.recebido > 0 ? '#ff6b6b' : '#ccc' }}>
                              R$ {(f.valor - f.recebido).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* INVOICES TABLE */}
              <div>
                <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>📋 Histórico de Faturas</h2>
                {faturas.length === 0 ? (
                  <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                    Nenhuma fatura registrada
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>📅 Mês</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Vencimento</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Valor</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Pago em</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturas.map((fatura, idx) => {
                          const statusColor = {
                            paga: '#4caf50',
                            aberta: '#2196f3',
                            atrasada: '#f44336',
                            cancelada: '#999',
                          }[fatura.status];

                          const statusLabel = {
                            paga: '✅ Paga',
                            aberta: '⏳ Aberta',
                            atrasada: '⚠️ Atrasada',
                            cancelada: '❌ Cancelada',
                          }[fatura.status];

                          return (
                            <tr key={fatura.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white' }}>
                              <td style={{ padding: '12px', fontWeight: '500', color: '#333' }}>
                                {new Date(fatura.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                                {new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ff9800' }}>
                                R$ {fatura.valor.toFixed(2)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{ padding: '4px 12px', backgroundColor: statusColor + '22', color: statusColor, borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                                {fatura.data_pagamento ? new Date(fatura.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  {fatura.status !== 'paga' && fatura.status !== 'cancelada' ? (
                                    <button
                                      onClick={() => handlePayment(fatura.id)}
                                      disabled={paymentProcessing === fatura.id}
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: paymentProcessing === fatura.id ? '#ccc' : '#4caf50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: paymentProcessing === fatura.id ? 'not-allowed' : 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {paymentProcessing === fatura.id ? '...' : '✅ Pago'}
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => handleEnviarReminderFatura(fatura.id)}
                                    disabled={reminderProcessing === fatura.id || !cliente?.whatsapp_numero}
                                    title={!cliente?.whatsapp_numero ? 'Configure o número de WhatsApp' : 'Enviar lembrete via WhatsApp'}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: !cliente?.whatsapp_numero ? '#ccc' : reminderProcessing === fatura.id ? '#e0e0e0' : '#2196f3',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: !cliente?.whatsapp_numero ? 'not-allowed' : 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {reminderProcessing === fatura.id ? '...' : '📱'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
