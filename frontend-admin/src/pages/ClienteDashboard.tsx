import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, TrendingUp, AlertCircle, Zap, Target, Loader, BarChart3, CheckCircle2, Lightbulb, ArrowRight, XCircle, MessageSquare, Key } from 'lucide-react';
import { colors, spacing, typography, shadows, radius, glassMorphism, keyframes } from '../theme';
import CriarLoginClienteModal from '../components/CriarLoginClienteModal';
import type { Theme } from '../theme';

interface Campanha {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  ctr_rate: number;
  roas: number;
}

interface ResumoRelatorio {
  periodo: { inicio: string; fim: string };
  resumo: {
    totalSpend: number;
    totalCliques: number;
    totalConversoes: number;
    totalConversasIniciadasMensagem: number;
    roas: number;
    totalImpressoes: number;
    cpmMedio: number;
    cpcMedio: number;
  };
  analise: { score: number; saude: string; insights: string[]; recomendacoes: string[] };
  comparacao_anterior: {
    variacao_spend: number;
    variacao_cliques: number;
    variacao_conversoes: number;
    tendencia: string;
    analise: string;
  };
  campanhas: Campanha[];
}

interface InsightsCampanha {
  oportunidades: string[];
  alertas: string[];
  proximos_passos: string[];
  analise_concorrencial: string;
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
}

type PeriodType = 'last_7d' | 'last_30d' | 'last_90d';

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { clienteId } = useParams<{ clienteId: string }>();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('last_30d');
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [insights, setInsights] = useState<InsightsCampanha | null>(null);
  const [error, setError] = useState('');
  const [modalLoginAberto, setModalLoginAberto] = useState(false);

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (clienteId) {
      carregarDados();
      carregarClienteInfo();
    }
  }, [clienteId, period]);

  const carregarClienteInfo = async () => {
    if (!clienteId) return;

    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCliente(data);
      }
    } catch (err) {
      console.error('Erro ao carregar info do cliente:', err);
    }
  };

  const carregarDados = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);
      setError('');

      // Carregar resumo do relatório
      const resResumo = await fetch(`/api/admin/clientes/${clienteId}/relatorio/resumo?periodo=${period}`, {
        credentials: 'include',
      });
      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        setResumo(dataResumo);
      }

      // Carregar análise IA
      const resInsights = await fetch(`/api/admin/clientes/${clienteId}/relatorio/analise-ia`, { credentials: 'include' });
      if (resInsights.ok) {
        const dataInsights = await resInsights.json();
        if (dataInsights && Object.keys(dataInsights).length > 0) {
          setInsights(dataInsights);
        } else {
          setInsights({
            oportunidades: ['Aguardando dados de campanhas'],
            alertas: [],
            proximos_passos: ['Ative campanhas para análise automática'],
            analise_concorrencial: 'Análise indisponível sem dados',
          });
        }
      } else {
        console.warn('Erro ao carregar insights:', resInsights.status);
        setInsights({
          oportunidades: ['Erro ao carregar análise'],
          alertas: [],
          proximos_passos: ['Tente recarregar a página'],
          analise_concorrencial: 'Erro na análise',
        });
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const enviarRelatorio = async () => {
    if (!clienteId) return;

    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}/relatorio/enviar-agora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        alert('✅ Relatório enviado via WhatsApp com sucesso!');
      } else {
        const data = await response.json();
        alert(`❌ Erro ao enviar: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      alert('❌ Erro ao conectar com o servidor');
      console.error(err);
    }
  };

  const obterCorSaude = (saude: string) => {
    switch (saude) {
      case 'excelente':
        return '#10b981';
      case 'bom':
        return '#3b82f6';
      case 'regular':
        return '#f59e0b';
      case 'crítico':
        return '#ef4444';
      default:
        return c.text.secondary;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: c.bg.primary, color: c.text.primary }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{ backgroundColor: c.bg.secondary, borderBottom: `1px solid ${c.border}`, padding: `${spacing.md} ${spacing.lg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: shadows.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.primary }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ ...typography.heading, margin: 0 }}>{cliente?.nome || 'Dashboard'}</h1>
            <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Relatórios e Análise</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            onClick={() => enviarRelatorio()}
            style={{
              backgroundColor: c.accent,
              color: '#fff',
              border: 'none',
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <BarChart3 size={16} />
            Enviar Relatório
          </button>

          <button
            onClick={() => setModalLoginAberto(true)}
            style={{
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.md,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Key size={16} />
            Criar/Resetar Login
          </button>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.secondary, padding: spacing.sm }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>

      {/* Modal de Criar Login */}
      {clienteId && cliente && (
        <CriarLoginClienteModal
          clienteId={clienteId}
          clienteNome={cliente.nome}
          isOpen={modalLoginAberto}
          onClose={() => setModalLoginAberto(false)}
          onSuccess={() => {
            setModalLoginAberto(false);
          }}
        />
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: spacing.lg, background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 100%)` }}>
        {error && (
          <div style={{ backgroundColor: c.error + '20', color: c.error, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, border: `1px solid ${c.error}40`, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Loader size={48} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !resumo ? (
          <div style={{ textAlign: 'center', padding: spacing.xl }}>Sem dados disponíveis</div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Período Seletor */}
            <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: c.text.secondary }}>Período:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodType)}
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: radius.md,
                  backgroundColor: c.bg.secondary,
                  color: c.text.primary,
                  border: `1px solid ${c.border}`,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="last_7d">Últimos 7 dias</option>
                <option value="last_30d">Últimos 30 dias</option>
                <option value="last_90d">Últimos 90 dias</option>
              </select>
            </div>

            {/* Card Conversas Iniciadas - PRINCIPAL */}
            <div
              style={{
                ...glassMorphism[theme],
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: `2px solid ${c.accent}`,
                marginBottom: spacing.lg,
                backgroundColor: theme === 'light' ? c.accent + '10' : c.accent + '15',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary, fontWeight: '600' }}>Conversas Iniciadas via WhatsApp</h3>
                <MessageSquare size={20} color={c.accent} />
              </div>
              <p style={{ ...typography.heading, margin: 0, color: c.accent, fontSize: '32px' }}>
                {(resumo.resumo.totalConversasIniciadasMensagem as any) || 0}
              </p>
              <p style={{ fontSize: '12px', color: c.text.secondary, margin: `${spacing.sm} 0 0 0`, fontWeight: '500' }}>
                Leads gerados no período
              </p>
            </div>

            {/* Resumo Executivo - Cards Principais */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              {/* Card Score */}
              <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Score de Desempenho</h3>
                  <TrendingUp size={18} color={c.accent} />
                </div>
                <p style={{ ...typography.heading, margin: 0, color: obterCorSaude(resumo.analise.saude) }}>{resumo.analise.score}</p>
                <div style={{ width: '100%', height: '4px', backgroundColor: c.bg.tertiary, borderRadius: radius.sm, marginTop: spacing.md, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${resumo.analise.score}%`, backgroundColor: obterCorSaude(resumo.analise.saude), transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Card Saúde */}
              <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Status</h3>
                  <AlertCircle size={18} color={obterCorSaude(resumo.analise.saude)} />
                </div>
                <p style={{ ...typography.heading, margin: 0, color: obterCorSaude(resumo.analise.saude), textTransform: 'capitalize' }}>{resumo.analise.saude}</p>
              </div>

              {/* Card Spend */}
              <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Investimento</h3>
                  <Target size={18} color={c.accent} />
                </div>
                <p style={{ ...typography.heading, margin: 0, color: c.accent }}>{formatarMoeda(resumo.resumo.totalSpend)}</p>
              </div>
            </div>

            {/* Insights de IA */}
            {insights && (
              <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md }}><Zap size={20} /> Análise com IA</h2>

                {insights.analise_concorrencial && (
                  <div style={{ marginBottom: spacing.lg, padding: spacing.md, backgroundColor: c.bg.tertiary, borderRadius: radius.md, fontSize: '14px', lineHeight: '1.6' }}>
                    <p style={{ margin: 0 }}>{insights.analise_concorrencial}</p>
                  </div>
                )}

                {insights.oportunidades.length > 0 && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: spacing.sm, display: 'flex', alignItems: 'center', gap: spacing.sm }}><CheckCircle2 size={16} /> Oportunidades</h3>
                    <ul style={{ margin: 0, paddingLeft: spacing.lg, listStyle: 'none' }}>
                      {insights.oportunidades.map((oportunidade, i) => (
                        <li key={i} style={{ padding: `${spacing.xs} 0`, color: c.text.primary, fontSize: '13px' }}>
                          • {oportunidade}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.alertas.length > 0 && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', color: c.error, marginBottom: spacing.sm, display: 'flex', alignItems: 'center', gap: spacing.sm }}><AlertCircle size={16} /> Alertas</h3>
                    <ul style={{ margin: 0, paddingLeft: spacing.lg, listStyle: 'none' }}>
                      {insights.alertas.map((alerta, i) => (
                        <li key={i} style={{ padding: `${spacing.xs} 0`, color: c.text.primary, fontSize: '13px' }}>
                          • {alerta}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.proximos_passos.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', color: c.accent, marginBottom: spacing.sm, display: 'flex', alignItems: 'center', gap: spacing.sm }}><ArrowRight size={16} /> Próximos Passos</h3>
                    <ul style={{ margin: 0, paddingLeft: spacing.lg, listStyle: 'none' }}>
                      {insights.proximos_passos.map((passo, i) => (
                        <li key={i} style={{ padding: `${spacing.xs} 0`, color: c.text.primary, fontSize: '13px' }}>
                          • {passo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Insights Principais */}
            {resumo.analise.insights.length > 0 && (
              <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md }}><Lightbulb size={20} /> Insights Principais</h2>
                <div style={{ display: 'grid', gap: spacing.md }}>
                  {resumo.analise.insights.map((insight, i) => (
                    <div key={i} style={{ padding: spacing.md, backgroundColor: c.bg.tertiary, borderRadius: radius.md, fontSize: '14px', borderLeft: `3px solid ${c.accent}` }}>
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {resumo.analise.recomendacoes.length > 0 && (
              <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md }}><Target size={20} /> Recomendações</h2>
                <div style={{ display: 'grid', gap: spacing.md }}>
                  {resumo.analise.recomendacoes.map((rec, i) => (
                    <div key={i} style={{ padding: spacing.md, backgroundColor: c.bg.tertiary, borderRadius: radius.md, fontSize: '14px', borderLeft: `3px solid #fbbf24` }}>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparação Período Anterior */}
            {resumo.comparacao_anterior && (
              <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md }}><BarChart3 size={20} /> Comparação com Período Anterior</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: spacing.md }}>
                  <div>
                    <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Variação de Spend</p>
                    <p style={{ ...typography.body, margin: `${spacing.xs} 0 0 0`, color: resumo.comparacao_anterior.variacao_spend > 0 ? c.error : '#10b981' }}>
                      {resumo.comparacao_anterior.variacao_spend > 0 ? '+' : ''}{resumo.comparacao_anterior.variacao_spend.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Variação de Cliques</p>
                    <p style={{ ...typography.body, margin: `${spacing.xs} 0 0 0`, color: resumo.comparacao_anterior.variacao_cliques > 0 ? '#10b981' : c.error }}>
                      {resumo.comparacao_anterior.variacao_cliques > 0 ? '+' : ''}{resumo.comparacao_anterior.variacao_cliques.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Variação de Conversões</p>
                    <p style={{ ...typography.body, margin: `${spacing.xs} 0 0 0`, color: resumo.comparacao_anterior.variacao_conversoes > 0 ? '#10b981' : c.error }}>
                      {resumo.comparacao_anterior.variacao_conversoes > 0 ? '+' : ''}{resumo.comparacao_anterior.variacao_conversoes.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Tendência</p>
                    <p style={{ ...typography.body, margin: `${spacing.xs} 0 0 0`, textTransform: 'capitalize' }}>
                      {resumo.comparacao_anterior.tendencia}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Campanhas Detalhadas */}
            {resumo && resumo.campanhas.length > 0 && (
              <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg, overflowX: 'auto' }}>
                <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.md }}><BarChart3 size={20} /> Detalhes das Campanhas</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${c.border}` }}>
                      <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>Campanha</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>Impressões</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>Cliques</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>CTR</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>CPC</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>Conversões</th>
                      <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary, fontWeight: '600' }}>Investimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.campanhas.map((campanha, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${c.border}` }}>
                        <td style={{ padding: spacing.md, color: c.text.primary, fontWeight: '500' }}>{campanha.name}</td>
                        <td style={{ padding: spacing.md, color: c.text.primary, textAlign: 'right' }}>{campanha.impressions.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: spacing.md, color: c.text.primary, textAlign: 'right' }}>{campanha.clicks.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: spacing.md, color: c.text.primary, textAlign: 'right' }}>{campanha.ctr_rate.toFixed(2)}%</td>
                        <td style={{ padding: spacing.md, color: c.text.primary, textAlign: 'right' }}>R$ {campanha.cpc.toFixed(2)}</td>
                        <td style={{ padding: spacing.md, color: '#10b981', textAlign: 'right', fontWeight: '500' }}>{campanha.conversions.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: spacing.md, color: c.accent, textAlign: 'right', fontWeight: '500' }}>R$ {campanha.spend.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
