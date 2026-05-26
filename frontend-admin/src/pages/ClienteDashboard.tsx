import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Sun, Moon } from 'lucide-react';
import { colors, spacing, typography, shadows, radius, animations, glassMorphism, keyframes } from '../theme';
import type { Theme } from '../theme';

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  }, []);

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

  const c = colors[theme];

  if (loading) {
    return (
      <div style={{
        padding: spacing.lg,
        textAlign: 'center',
        color: c.text.secondary,
        backgroundColor: c.bg.primary,
        minHeight: '100vh',
      }}>
        Carregando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: spacing.lg,
        backgroundColor: c.bg.primary,
        minHeight: '100vh',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: c.accent,
            color: 'white',
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
            marginBottom: spacing.lg,
            ...typography.small,
            fontWeight: '500',
          }}
        >
          ← Voltar
        </button>
        <div style={{
          padding: spacing.md,
          backgroundColor: theme === 'light' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 69, 58, 0.2)',
          borderRadius: radius.md,
          color: colors[theme].error,
          border: `1px solid ${colors[theme].error}`,
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div style={{
        padding: spacing.lg,
        textAlign: 'center',
        color: c.text.secondary,
        backgroundColor: c.bg.primary,
        minHeight: '100vh',
      }}>
        Cliente não encontrado
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: c.bg.primary,
      color: c.text.primary,
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
      transition: 'background-color 0.3s, color 0.3s',
      background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%, ${c.bg.tertiary} 100%)`,
      backgroundSize: '200% 200%',
      ...animations.gradientShift,
    }}>
      {/* HEADER */}
      <div style={{
        backgroundColor: c.bg.primary,
        borderBottom: `1px solid ${c.border}`,
        padding: `${spacing.lg} ${spacing.lg}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        minHeight: '80px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: 'transparent',
              color: c.text.primary,
              border: `1px solid ${c.border}`,
              borderRadius: radius.md,
              cursor: 'pointer',
              fontSize: typography.small.fontSize,
              fontWeight: '500',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = c.bg.secondary;
              e.currentTarget.style.boxShadow = `inset 0 0 12px ${c.accent}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                ...typography.title,
                color: c.text.primary,
                margin: 0,
                fontSize: '24px',
              }}
            >
              {cliente.nome}
            </h1>
            <p
              style={{
                ...typography.small,
                color: c.text.secondary,
                margin: `${spacing.xs} 0 0 0`,
              }}
            >
              {cliente.email}
            </p>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{
            background: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: radius.md,
            padding: spacing.sm,
            cursor: 'pointer',
            color: c.text.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease-out',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = c.bg.secondary;
            e.currentTarget.style.boxShadow = `0 0 12px ${c.accent}33`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        padding: spacing.lg,
        maxWidth: '1400px',
        margin: '0 auto',
        animation: 'fadeIn 0.5s ease-out',
      }}>
        {/* INFO SECTION */}
        <div style={{
          marginBottom: spacing.xxl,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
        }}>
        {activeTab === 'campanhas' && (
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <label style={{
                ...typography.small,
                color: c.text.secondary,
                fontWeight: '600',
                textTransform: 'uppercase',
                fontSize: '11px',
              }}>
                Período
              </label>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                {['last_7d', 'last_30d', 'last_90d'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setUseCustomDate(false);
                      setPeriod(p as PeriodType);
                    }}
                    style={{
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: !useCustomDate && period === p ? c.accent : c.bg.secondary,
                      color: !useCustomDate && period === p ? '#FFFFFF' : c.text.primary,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      cursor: 'pointer',
                      ...typography.small,
                      fontWeight: !useCustomDate && period === p ? '600' : '400',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (useCustomDate || period !== p) {
                        e.currentTarget.style.backgroundColor = c.bg.tertiary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (useCustomDate || period !== p) {
                        e.currentTarget.style.backgroundColor = c.bg.secondary;
                      }
                    }}
                  >
                    {p === 'last_7d' ? '7 dias' : p === 'last_30d' ? '30 dias' : '90 dias'}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustomDate(!useCustomDate)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: useCustomDate ? colors[theme].warning : c.bg.secondary,
                    color: useCustomDate ? '#FFFFFF' : c.text.primary,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    ...typography.small,
                    fontWeight: useCustomDate ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!useCustomDate) {
                      e.currentTarget.style.backgroundColor = c.bg.tertiary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!useCustomDate) {
                      e.currentTarget.style.backgroundColor = c.bg.secondary;
                    }
                  }}
                >
                  Customizado
                </button>
              </div>
              {useCustomDate && (
                <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                    <label style={{ ...typography.tiny, color: c.text.secondary }}>De:</label>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      style={{
                        padding: `${spacing.sm} ${spacing.sm}`,
                        border: `1px solid ${c.border}`,
                        borderRadius: radius.md,
                        backgroundColor: c.bg.secondary,
                        color: c.text.primary,
                        ...typography.small,
                        width: '140px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                    <label style={{ ...typography.tiny, color: c.text.secondary }}>Até:</label>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      style={{
                        padding: `${spacing.sm} ${spacing.sm}`,
                        border: `1px solid ${c.border}`,
                        borderRadius: radius.md,
                        backgroundColor: c.bg.secondary,
                        color: c.text.primary,
                        ...typography.small,
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
                padding: `${spacing.sm} ${spacing.lg}`,
                backgroundColor: cliente?.whatsapp_numero ? colors[theme].success : c.border,
                color: 'white',
                border: 'none',
                borderRadius: radius.md,
                cursor: cliente?.whatsapp_numero ? 'pointer' : 'not-allowed',
                ...typography.small,
                fontWeight: '600',
                opacity: relatorioProcessing ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
              title={!cliente?.whatsapp_numero ? 'Configure o número de WhatsApp' : 'Enviar relatório de campanhas'}
              onMouseEnter={(e) => {
                if (cliente?.whatsapp_numero && !relatorioProcessing) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = relatorioProcessing ? '0.6' : '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {relatorioProcessing ? 'Enviando...' : 'Enviar Relatório'}
            </button>
          </div>
        )}
        </div>

        {/* TABS */}
        <div
          style={{
            display: 'flex',
            gap: spacing.lg,
            marginBottom: spacing.xxl,
            borderBottom: `1px solid ${c.border}`,
            paddingBottom: 0,
            ...animations.slideUp,
            animation: 'slideUp 0.5s ease-out',
          }}
        >
          {['campanhas', 'financeiro'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                backgroundColor: 'transparent',
                color: activeTab === tab ? c.text.primary : c.text.secondary,
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${c.accent}` : '2px solid transparent',
                cursor: 'pointer',
                ...typography.body,
                fontWeight: activeTab === tab ? '600' : '400',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = c.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.color = c.text.secondary;
                }
              }}
            >
              {tab === 'campanhas' ? 'Campanhas' : 'Financeiro'}
            </button>
          ))}
        </div>

        {activeTab === 'campanhas' ? (
          <>
            {!cliente.meta_ads_account_id ? (
              <div style={{
                padding: spacing.lg,
                backgroundColor: theme === 'light' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 152, 0, 0.15)',
                border: `1px solid ${colors[theme].warning}`,
                borderRadius: radius.lg,
                color: colors[theme].warning,
                marginBottom: spacing.lg,
                ...typography.small,
              }}>
                ⚠️ Cliente não possui ID de conta Meta Ads configurado. Configure na página de clientes.
              </div>
            ) : !relatorio ? (
              <div style={{
                padding: spacing.lg,
                backgroundColor: theme === 'light' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(10, 132, 255, 0.15)',
                border: `1px solid ${c.accent}`,
                borderRadius: radius.lg,
                color: c.accent,
                marginBottom: spacing.lg,
                ...typography.small,
              }}>
                ℹ️ Carregando dados da Meta Ads...
              </div>
            ) : (
            <>
              {/* CARDS DE RESUMO */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: spacing.lg,
                  marginBottom: spacing.xxl,
                  animation: 'slideUp 0.5s ease-out',
                }}
              >
                {[
                  { label: 'Investimento Total', value: `R$ ${relatorio.resumo.totalSpend.toFixed(2)}`, desc: 'Gasto em publicidade' },
                  { label: 'Cliques', value: relatorio.resumo.totalCliques.toLocaleString('pt-BR'), desc: 'Pessoas que clicaram' },
                  { label: 'Mensagens Iniciadas', value: relatorio.resumo.totalMensagens.toLocaleString('pt-BR'), desc: 'Conversas no WhatsApp/Messenger' },
                  { label: 'Conversões', value: relatorio.resumo.totalConversoes.toLocaleString('pt-BR'), desc: 'Vendas/Ações completadas' },
                  { label: 'Eficiência (ROAS)', value: `${relatorio.resumo.roas.toFixed(2)}x`, desc: 'Retorno por real investido' },
                  { label: 'CPM Médio', value: `R$ ${relatorio.resumo.cpmMedio.toFixed(2)}`, desc: 'Custo por mil impressões' },
                ].map((metric, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...(theme === 'light' ? glassMorphism.light : glassMorphism.dark),
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      ...animations.slideUp,
                      transitionDelay: `${idx * 50}ms`,
                      ...animations.float,
                      transition: 'all 0.3s ease-out, box-shadow 0.3s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <p
                      style={{
                        ...typography.tiny,
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        margin: `0 0 ${spacing.sm} 0`,
                      }}
                    >
                      {metric.label}
                    </p>
                    <p style={{ ...typography.title, color: c.text.primary, margin: 0 }}>
                      {metric.value}
                    </p>
                    <p style={{ ...typography.tiny, color: c.text.tertiary, margin: `${spacing.sm} 0 0 0` }}>
                      {metric.desc}
                    </p>
                  </div>
                ))}
              </div>
              {/* CAMPANHAS ATIVAS */}
              <div style={{ ...animations.slideUp, animation: 'slideUp 0.5s ease-out 0.15s backwards' }}>
                <h2
                  style={{
                    ...typography.heading,
                    marginTop: 0,
                    marginBottom: spacing.lg,
                    color: c.text.primary,
                  }}
                >
                  Campanhas Ativas ({relatorio.campanhas.length})
                </h2>
                {relatorio.campanhas.length === 0 ? (
                  <div style={{
                    padding: spacing.lg,
                    backgroundColor: c.bg.secondary,
                    borderRadius: radius.lg,
                    textAlign: 'center',
                    color: c.text.secondary,
                    border: `1px solid ${c.border}`,
                  }}>
                    Nenhuma campanha encontrada
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: c.bg.secondary,
                      borderRadius: radius.lg,
                      border: `1px solid ${c.border}`,
                      overflow: 'hidden',
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: c.bg.tertiary,
                          borderBottom: `1px solid ${c.border}`,
                        }}>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'left',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Campanha</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Vistos</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Cliques</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Taxa</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Conversões</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Msgs</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>CPM</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>CPC</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Investido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorio.campanhas.map((campanha, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: `1px solid ${c.border}`,
                              backgroundColor: idx % 2 === 0 ? c.bg.primary : c.bg.secondary,
                              transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = c.bg.tertiary;
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = idx % 2 === 0 ? c.bg.primary : c.bg.secondary;
                            }}
                          >
                            <td style={{
                              padding: spacing.md,
                              color: c.text.primary,
                              ...typography.small,
                              fontWeight: '500',
                            }}>{campanha.nome}</td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.text.secondary,
                              ...typography.small,
                            }}>
                              {campanha.impressoes.toLocaleString('pt-BR')}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.text.secondary,
                              ...typography.small,
                            }}>
                              {campanha.cliques.toLocaleString('pt-BR')}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.accent,
                              ...typography.small,
                              fontWeight: '500',
                            }}>
                              {campanha.ctr.toFixed(2)}%
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: colors[theme].success,
                              ...typography.small,
                              fontWeight: '500',
                            }}>
                              {campanha.conversoes.toLocaleString('pt-BR')}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.text.secondary,
                              ...typography.small,
                            }}>
                              {campanha.mensagens.toLocaleString('pt-BR')}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.text.secondary,
                              ...typography.small,
                            }}>
                              R$ {campanha.cpm.toFixed(2)}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: c.text.secondary,
                              ...typography.small,
                            }}>
                              R$ {campanha.cpc.toFixed(2)}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'center',
                              color: colors[theme].warning,
                              ...typography.small,
                              fontWeight: '600',
                            }}>
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
              <div
                style={{
                  marginTop: spacing.xxl,
                  padding: spacing.md,
                  backgroundColor:
                    theme === 'light'
                      ? 'rgba(0, 122, 255, 0.05)'
                      : 'rgba(10, 132, 255, 0.05)',
                  border: `1px solid ${c.border}`,
                  borderRadius: radius.md,
                  color: c.accent,
                  fontSize: typography.small.fontSize,
                }}
              >
                Dados do período: {relatorio.periodo}
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: spacing.lg,
                  marginBottom: spacing.xxl,
                  animation: 'slideUp 0.5s ease-out',
                }}
              >
                {[
                  { label: 'Total Faturado', value: `R$ ${resumoFinanceiro?.totalFaturado.toFixed(2) || '0.00'}`, desc: 'Desde início de trabalhos' },
                  { label: 'Total Recebido', value: `R$ ${resumoFinanceiro?.totalRecebido.toFixed(2) || '0.00'}`, desc: 'Pagamentos confirmados' },
                  { label: 'Em Aberto', value: `R$ ${resumoFinanceiro?.totalEmAberto.toFixed(2) || '0.00'}`, desc: 'À receber' },
                  { label: 'Atrasado', value: `R$ ${resumoFinanceiro?.totalAtrasado.toFixed(2) || '0.00'}`, desc: 'Vencido não pago' },
                ].map((card, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...(theme === 'light' ? glassMorphism.light : glassMorphism.dark),
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      ...animations.slideUp,
                      transitionDelay: `${idx * 50}ms`,
                      ...animations.float,
                      transition: 'all 0.3s ease-out, box-shadow 0.3s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <p
                      style={{
                        ...typography.tiny,
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        margin: `0 0 ${spacing.sm} 0`,
                      }}
                    >
                      {card.label}
                    </p>
                    <p style={{ ...typography.title, color: c.text.primary, margin: 0 }}>
                      {card.value}
                    </p>
                    <p style={{ ...typography.tiny, color: c.text.tertiary, margin: `${spacing.sm} 0 0 0` }}>
                      {card.desc}
                    </p>
                  </div>
                ))}
                {resumoFinanceiro?.proximoVencimento && (
                  <div
                    style={{
                      ...(theme === 'light' ? glassMorphism.light : glassMorphism.dark),
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      ...animations.slideUp,
                      transitionDelay: '200ms',
                      ...animations.float,
                      transition: 'all 0.3s ease-out, box-shadow 0.3s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <p
                      style={{
                        ...typography.tiny,
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        margin: `0 0 ${spacing.sm} 0`,
                      }}
                    >
                      Próximo Vencimento
                    </p>
                    <p style={{ ...typography.title, color: c.text.primary, margin: 0 }}>
                      {new Date(resumoFinanceiro.proximoVencimento).toLocaleDateString('pt-BR')}
                    </p>
                    <p style={{ ...typography.tiny, color: c.text.tertiary, margin: `${spacing.sm} 0 0 0` }}>
                      Primeira fatura aberta
                    </p>
                  </div>
                )}
              </div>

              {/* BOTÃO ENVIAR RELATÓRIO */}
              <div style={{ marginBottom: spacing.xxl, display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                <button
                  onClick={handleEnviarRelatorioFinanceiro}
                  disabled={relatorioProcessing || !cliente?.whatsapp_numero}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    backgroundColor: cliente?.whatsapp_numero ? colors[theme].success : c.border,
                    color: 'white',
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: cliente?.whatsapp_numero ? 'pointer' : 'not-allowed',
                    ...typography.small,
                    fontWeight: '600',
                    opacity: relatorioProcessing ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                  title={!cliente?.whatsapp_numero ? 'Configure o número de WhatsApp' : 'Enviar relatório financeiro'}
                  onMouseEnter={(e) => {
                    if (cliente?.whatsapp_numero && !relatorioProcessing) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = relatorioProcessing ? '0.6' : '1';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {relatorioProcessing ? 'Enviando...' : 'Enviar Relatório Financeiro'}
                </button>
                {!cliente?.whatsapp_numero && (
                  <p style={{
                    margin: 0,
                    color: colors[theme].error,
                    ...typography.small,
                  }}>
                    Configure o número de WhatsApp na edição do cliente
                  </p>
                )}
              </div>

              {/* MONTHLY BILLING TABLE */}
              <div style={{ marginBottom: spacing.xxl, animation: 'slideUp 0.5s ease-out 0.1s backwards' }}>
                <h2
                  style={{
                    ...typography.heading,
                    marginTop: 0,
                    marginBottom: spacing.lg,
                    color: c.text.primary,
                  }}
                >
                  Faturamento Mensal
                </h2>
                {faturamentoMensal.length === 0 ? (
                  <div style={{
                    padding: spacing.lg,
                    backgroundColor: c.bg.secondary,
                    borderRadius: radius.lg,
                    textAlign: 'center',
                    color: c.text.secondary,
                    border: `1px solid ${c.border}`,
                  }}>
                    Nenhum faturamento registrado
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: c.bg.secondary,
                      borderRadius: radius.lg,
                      border: `1px solid ${c.border}`,
                      overflow: 'hidden',
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: c.bg.tertiary,
                          borderBottom: `1px solid ${c.border}`,
                        }}>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'left',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>📅 Mês</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'right',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>💰 Faturado</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'right',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>✅ Recebido</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'right',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>⏳ Pendente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturamentoMensal.map((f, idx) => (
                          <tr key={idx} style={{
                            borderBottom: `1px solid ${c.border}`,
                            backgroundColor: idx % 2 === 0 ? c.bg.primary : c.bg.secondary,
                            transition: 'background-color 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = c.bg.tertiary;
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = idx % 2 === 0 ? c.bg.primary : c.bg.secondary;
                          }}>
                            <td style={{
                              padding: spacing.md,
                              color: c.text.primary,
                              ...typography.small,
                              fontWeight: '500',
                            }}>{f.mes}</td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'right',
                              color: colors[theme].warning,
                              ...typography.small,
                              fontWeight: '600',
                            }}>
                              R$ {f.valor.toFixed(2)}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'right',
                              color: colors[theme].success,
                              ...typography.small,
                              fontWeight: '600',
                            }}>
                              R$ {f.recebido.toFixed(2)}
                            </td>
                            <td style={{
                              padding: spacing.md,
                              textAlign: 'right',
                              color: f.valor - f.recebido > 0 ? colors[theme].error : c.text.tertiary,
                              ...typography.small,
                              fontWeight: '600',
                            }}>
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
              <div style={{ animation: 'slideUp 0.5s ease-out 0.2s backwards' }}>
                <h2
                  style={{
                    ...typography.heading,
                    marginTop: 0,
                    marginBottom: spacing.lg,
                    color: c.text.primary,
                  }}
                >
                  Histórico de Faturas
                </h2>
                {faturas.length === 0 ? (
                  <div style={{
                    padding: spacing.lg,
                    backgroundColor: c.bg.secondary,
                    borderRadius: radius.lg,
                    textAlign: 'center',
                    color: c.text.secondary,
                    border: `1px solid ${c.border}`,
                  }}>
                    Nenhuma fatura registrada
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      backgroundColor: c.bg.secondary,
                      borderRadius: radius.lg,
                      border: `1px solid ${c.border}`,
                      overflow: 'hidden',
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: c.bg.tertiary,
                          borderBottom: `1px solid ${c.border}`,
                        }}>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'left',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>📅 Mês</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Vencimento</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'right',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Valor</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Status</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Pago em</th>
                          <th style={{
                            padding: spacing.md,
                            textAlign: 'center',
                            color: c.text.secondary,
                            ...typography.small,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faturas.map((fatura, idx) => {
                          const statusColor = {
                            paga: colors[theme].success,
                            aberta: c.accent,
                            atrasada: colors[theme].error,
                            cancelada: c.text.tertiary,
                          }[fatura.status];

                          const statusLabel = {
                            paga: '✅ Paga',
                            aberta: '⏳ Aberta',
                            atrasada: '⚠️ Atrasada',
                            cancelada: '❌ Cancelada',
                          }[fatura.status];

                          return (
                            <tr key={fatura.id} style={{
                              borderBottom: `1px solid ${c.border}`,
                              backgroundColor: idx % 2 === 0 ? c.bg.primary : c.bg.secondary,
                              transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = c.bg.tertiary;
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = idx % 2 === 0 ? c.bg.primary : c.bg.secondary;
                            }}>
                              <td style={{
                                padding: spacing.md,
                                color: c.text.primary,
                                ...typography.small,
                                fontWeight: '500',
                              }}>
                                {new Date(fatura.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                              </td>
                              <td style={{
                                padding: spacing.md,
                                textAlign: 'center',
                                color: c.text.secondary,
                                ...typography.small,
                              }}>
                                {new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
                              </td>
                              <td style={{
                                padding: spacing.md,
                                textAlign: 'right',
                                color: colors[theme].warning,
                                ...typography.small,
                                fontWeight: '600',
                              }}>
                                R$ {fatura.valor.toFixed(2)}
                              </td>
                              <td style={{
                                padding: spacing.md,
                                textAlign: 'center',
                              }}>
                                <span style={{
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  backgroundColor: theme === 'light' ? `${statusColor}22` : `${statusColor}33`,
                                  color: statusColor,
                                  borderRadius: radius.md,
                                  ...typography.tiny,
                                  fontWeight: 'bold',
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{
                                padding: spacing.md,
                                textAlign: 'center',
                                color: c.text.secondary,
                                ...typography.small,
                              }}>
                                {fatura.data_pagamento ? new Date(fatura.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                              </td>
                              <td style={{
                                padding: spacing.md,
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  display: 'flex',
                                  gap: spacing.xs,
                                  justifyContent: 'center',
                                  flexWrap: 'wrap',
                                }}>
                                  {fatura.status !== 'paga' && fatura.status !== 'cancelada' ? (
                                    <button
                                      onClick={() => handlePayment(fatura.id)}
                                      disabled={paymentProcessing === fatura.id}
                                      style={{
                                        padding: `${spacing.xs} ${spacing.sm}`,
                                        backgroundColor: paymentProcessing === fatura.id ? c.border : colors[theme].success,
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: radius.sm,
                                        cursor: paymentProcessing === fatura.id ? 'not-allowed' : 'pointer',
                                        ...typography.tiny,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (paymentProcessing !== fatura.id) {
                                          e.currentTarget.style.opacity = '0.9';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = '1';
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
                                      padding: `${spacing.xs} ${spacing.sm}`,
                                      backgroundColor: !cliente?.whatsapp_numero ? c.border : reminderProcessing === fatura.id ? c.bg.tertiary : c.accent,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: radius.sm,
                                      cursor: !cliente?.whatsapp_numero ? 'not-allowed' : 'pointer',
                                      ...typography.tiny,
                                      fontWeight: 'bold',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!reminderProcessing && cliente?.whatsapp_numero) {
                                        e.currentTarget.style.opacity = '0.9';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.opacity = '1';
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
    </div>
  );
}
