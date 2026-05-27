import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Zap, Target, Loader, ChevronDown, RefreshCw, CheckCircle2, Lightbulb, BarChart3 } from 'lucide-react';
import { colors, spacing, typography, shadows, radius, glassMorphism, keyframes } from '../theme';
import type { Theme } from '../theme';
import Header from '../components/Header';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  meta_ads_account_id?: string;
}

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
}

interface ResumoRelatorio {
  periodo: string;
  resumo: {
    totalSpend: number;
    totalCliques: number;
    totalConversoes: number;
    totalConversasIniciadasMensagem?: number;
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

type PeriodType = 'last_7d' | 'last_30d' | 'last_90d';
type TabType = 'analise' | 'campanhas';

export default function RelatorioClienteDashboard() {
  const navigate = useNavigate();
  const { clienteId: clienteIdFromUrl } = useParams<{ clienteId?: string }>();
  const [theme, setTheme] = useState<Theme>('light');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('last_30d');
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [insights, setInsights] = useState<InsightsCampanha | null>(null);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('analise');

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    carregarClientes();
  }, []);

  // Auto-select client if provided via URL params
  useEffect(() => {
    if (clienteIdFromUrl && clientes.length > 0) {
      const clienteValido = clientes.find((c) => c.id === clienteIdFromUrl);
      if (clienteValido) {
        setClienteSelecionado(clienteIdFromUrl);
      }
    }
  }, [clienteIdFromUrl, clientes]);

  // Auto-load report when client or period changes
  useEffect(() => {
    if (clienteSelecionado && !loadingRelatorio) {
      carregarRelatorio();
    }
  }, [clienteSelecionado, period]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/clientes', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const clientesComMeta = data.clientes?.filter((c: Cliente) => c.meta_ads_account_id) || [];
        setClientes(clientesComMeta);
        if (clientesComMeta.length > 0 && !clienteSelecionado) {
          setClienteSelecionado(clientesComMeta[0].id);
        }
      }
    } catch (err) {
      setError('Erro ao carregar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarRelatorio = async () => {
    if (!clienteSelecionado) return;

    try {
      setLoadingRelatorio(true);
      setError('');

      const [resResumo, resInsights] = await Promise.all([
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/resumo?periodo=${period}`, { credentials: 'include' }),
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/analise-ia`, { credentials: 'include' }),
      ]);

      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        console.log('Resumo:', dataResumo);
        setResumo(dataResumo);
      } else {
        const errorData = await resResumo.json();
        console.error('Erro resumo:', errorData);
        setError(errorData.error || 'Erro ao carregar resumo');
      }

      if (resInsights.ok) {
        const dataInsights = await resInsights.json();
        console.log('Insights:', dataInsights);
        setInsights(dataInsights);
      }
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error('Erro na requisição:', err);
    } finally {
      setLoadingRelatorio(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
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

  const clienteSelecionadoObj = clientes.find((c) => c.id === clienteSelecionado);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: c.bg.primary, color: c.text.primary }}>
      <style>{keyframes}</style>

      <Header
        theme={theme}
        onThemeChange={setTheme}
        onLogout={() => navigate('/login')}
        title="Análise de Clientes"
        subtitle="Meta Ads + IA"
        showBackButton
        onBack={() => navigate('/dashboard')}
      />

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: spacing.lg, background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 100%)` }}>
        {error && (
          <div style={{ backgroundColor: c.error + '20', color: c.error, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, border: `1px solid ${c.error}40`, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Loader size={48} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : clientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing.xl }}>Nenhum cliente com Meta Ads configurado</div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Seletor de Cliente e Período + Botão Refresh */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'end' }}>
              {/* Seletor de Cliente */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: c.text.secondary, display: 'block', marginBottom: spacing.sm }}>Cliente:</label>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: radius.md,
                    backgroundColor: c.bg.secondary,
                    color: c.text.primary,
                    border: `1px solid ${c.border}`,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{clienteSelecionadoObj?.nome || 'Selecionar cliente'}</span>
                  <ChevronDown size={16} />
                </button>

                {showDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: c.bg.secondary, border: `1px solid ${c.border}`, borderRadius: radius.md, marginTop: spacing.xs, boxShadow: shadows.lg, zIndex: 10 }}>
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setClienteSelecionado(cliente.id);
                          setShowDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: `${spacing.sm} ${spacing.md}`,
                          backgroundColor: clienteSelecionado === cliente.id ? c.bg.tertiary : 'transparent',
                          color: c.text.primary,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          textAlign: 'left',
                          borderBottom: `1px solid ${c.border}`,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = c.bg.tertiary;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = clienteSelecionado === cliente.id ? c.bg.tertiary : 'transparent';
                        }}
                      >
                        {cliente.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Seletor de Período */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: c.text.secondary, display: 'block', marginBottom: spacing.sm }}>Período:</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodType)}
                  style={{
                    width: '100%',
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

              {/* Botão Refresh Análise */}
              <button
                onClick={carregarRelatorio}
                disabled={loadingRelatorio || !clienteSelecionado}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  borderRadius: radius.md,
                  backgroundColor: c.accent,
                  color: 'white',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loadingRelatorio || !clienteSelecionado ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  opacity: loadingRelatorio || !clienteSelecionado ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <RefreshCw size={16} style={{ animation: loadingRelatorio ? 'spin 1s linear infinite' : 'none' }} />
                Forçar Análise
              </button>
            </div>

            {/* Relatório com Abas */}
            {loadingRelatorio ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : !resumo ? (
              <div style={{ textAlign: 'center', padding: spacing.lg }}>Sem dados disponíveis para este cliente</div>
            ) : (
              <>
                {/* Cards Principais */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
                  <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Score</h3>
                      <TrendingUp size={18} color={c.accent} />
                    </div>
                    <p style={{ ...typography.heading, margin: 0, color: obterCorSaude(resumo.analise.saude) }}>{resumo.analise.score}</p>
                    <div style={{ width: '100%', height: '4px', backgroundColor: c.bg.tertiary, borderRadius: radius.sm, marginTop: spacing.md, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${resumo.analise.score}%`, backgroundColor: obterCorSaude(resumo.analise.saude) }} />
                    </div>
                  </div>

                  <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Status</h3>
                      <AlertCircle size={18} color={obterCorSaude(resumo.analise.saude)} />
                    </div>
                    <p style={{ ...typography.heading, margin: 0, color: obterCorSaude(resumo.analise.saude), textTransform: 'capitalize' }}>{resumo.analise.saude}</p>
                  </div>

                  <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Investimento</h3>
                      <Target size={18} color={c.accent} />
                    </div>
                    <p style={{ ...typography.heading, margin: 0, color: c.accent }}>{formatarMoeda(resumo.resumo.totalSpend)}</p>
                  </div>

                  {resumo.resumo.totalConversasIniciadasMensagem !== undefined && resumo.resumo.totalConversasIniciadasMensagem > 0 && (
                    <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                        <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Conversas Iniciadas</h3>
                        <Zap size={18} color="#06b6d4" />
                      </div>
                      <p style={{ ...typography.heading, margin: 0, color: '#06b6d4' }}>{resumo.resumo.totalConversasIniciadasMensagem}</p>
                    </div>
                  )}
                </div>

                {/* Abas */}
                <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, borderBottom: `2px solid ${c.border}` }}>
                  {(['analise', 'campanhas'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: `${spacing.md} ${spacing.lg}`,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: activeTab === tab ? c.accent : c.text.secondary,
                        borderBottom: activeTab === tab ? `3px solid ${c.accent}` : 'none',
                        marginBottom: '-2px',
                        transition: 'color 0.2s',
                      }}
                    >
                      {tab === 'analise' && <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}><Zap size={16} /> Análise com IA</div>}
                      {tab === 'campanhas' && <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}><BarChart3 size={16} /> Meta Ads</div>}
                    </button>
                  ))}
                </div>

                {/* Conteúdo das Abas */}
                {activeTab === 'analise' && (
                  <>
                    {insights && (
                      <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                          <Zap size={24} color={c.accent} />
                          <h2 style={{ ...typography.heading, margin: 0 }}>Análise Detalhada com IA</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.md }}>
                          {insights.oportunidades.length > 0 && (
                            <div style={{ backgroundColor: c.bg.tertiary, borderRadius: radius.lg, padding: spacing.lg, borderTop: `3px solid #10b981` }}>
                              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#10b981', marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                <CheckCircle2 size={18} /> Oportunidades
                              </h3>
                              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                                {insights.oportunidades.map((item, i) => (
                                  <li key={i} style={{ padding: `${spacing.xs} 0`, fontSize: '13px', color: c.text.primary, display: 'flex', gap: spacing.sm }}>
                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>→</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {insights.alertas.length > 0 && (
                            <div style={{ backgroundColor: c.bg.tertiary, borderRadius: radius.lg, padding: spacing.lg, borderTop: `3px solid ${c.error}` }}>
                              <h3 style={{ fontSize: '14px', fontWeight: '700', color: c.error, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                <AlertCircle size={18} /> Alertas
                              </h3>
                              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                                {insights.alertas.map((item, i) => (
                                  <li key={i} style={{ padding: `${spacing.xs} 0`, fontSize: '13px', color: c.text.primary, display: 'flex', gap: spacing.sm }}>
                                    <span style={{ color: c.error, fontWeight: 'bold' }}>!</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {insights.proximos_passos.length > 0 && (
                            <div style={{ backgroundColor: c.bg.tertiary, borderRadius: radius.lg, padding: spacing.lg, borderTop: `3px solid ${c.accent}` }}>
                              <h3 style={{ fontSize: '14px', fontWeight: '700', color: c.accent, marginTop: 0, marginBottom: spacing.md, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                                <Target size={18} /> Próximos Passos
                              </h3>
                              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                                {insights.proximos_passos.map((item, i) => (
                                  <li key={i} style={{ padding: `${spacing.xs} 0`, fontSize: '13px', color: c.text.primary, display: 'flex', gap: spacing.sm }}>
                                    <span style={{ color: c.accent, fontWeight: 'bold' }}>&gt;</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {resumo.analise.insights.length > 0 && (
                      <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                          <Lightbulb size={24} color={c.accent} />
                          <h2 style={{ ...typography.heading, margin: 0 }}>Insights Principais</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.md }}>
                          {resumo.analise.insights.map((insight, i) => (
                            <div
                              key={i}
                              style={{
                                padding: spacing.lg,
                                backgroundColor: c.bg.tertiary,
                                borderRadius: radius.lg,
                                fontSize: '14px',
                                lineHeight: '1.6',
                                borderLeft: `4px solid ${c.accent}`,
                                boxShadow: `0 2px 8px ${c.accent}15`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 4px 16px ${c.accent}25`;
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 2px 8px ${c.accent}15`;
                              }}
                            >
                              {insight}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resumo.analise.recomendacoes.length > 0 && (
                      <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                          <Target size={24} color={c.accent} />
                          <h2 style={{ ...typography.heading, margin: 0 }}>Recomendações de Ação</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.md }}>
                          {resumo.analise.recomendacoes.map((rec, i) => (
                            <div
                              key={i}
                              style={{
                                padding: spacing.lg,
                                backgroundColor: c.bg.tertiary,
                                borderRadius: radius.lg,
                                fontSize: '14px',
                                lineHeight: '1.6',
                                borderLeft: `4px solid #fbbf24`,
                                boxShadow: `0 2px 8px #fbbf2415`,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 4px 16px #fbbf2425`;
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 2px 8px #fbbf2415`;
                              }}
                            >
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'campanhas' && (
                  <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md }}>Campanhas de Meta Ads</h2>
                    {resumo.campanhas.length === 0 ? (
                      <p style={{ color: c.text.secondary }}>Nenhuma campanha encontrada para este período</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${c.border}` }}>
                              <th style={{ textAlign: 'left', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>Campanha</th>
                              <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>Impressões</th>
                              <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>Cliques</th>
                              <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>CTR</th>
                              <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>Conversões</th>
                              <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary, fontWeight: '600' }}>Custo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumo.campanhas.map((camp, i) => (
                              <tr key={i} style={{ borderBottom: `1px solid ${c.border}` }}>
                                <td style={{ padding: spacing.sm, color: c.text.primary }}>{camp.name}</td>
                                <td style={{ padding: spacing.sm, color: c.text.primary, textAlign: 'right' }}>{camp.impressions.toLocaleString('pt-BR')}</td>
                                <td style={{ padding: spacing.sm, color: c.text.primary, textAlign: 'right' }}>{camp.clicks.toLocaleString('pt-BR')}</td>
                                <td style={{ padding: spacing.sm, color: c.text.primary, textAlign: 'right' }}>{(camp.ctr_rate * 100).toFixed(2)}%</td>
                                <td style={{ padding: spacing.sm, color: c.text.primary, textAlign: 'right' }}>{camp.conversions.toLocaleString('pt-BR')}</td>
                                <td style={{ padding: spacing.sm, color: c.text.primary, textAlign: 'right' }}>{formatarMoeda(camp.spend)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </>
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
