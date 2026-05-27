import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, TrendingUp, AlertCircle, Zap, Target, Loader, ChevronDown } from 'lucide-react';
import { colors, spacing, typography, shadows, radius, glassMorphism, keyframes } from '../theme';
import type { Theme } from '../theme';

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
  roas: number;
}

interface ResumoRelatorio {
  periodo: { inicio: string; fim: string };
  resumo: { spend: number; cliques: number; conversoes: number; roas: number };
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

interface Previsao {
  roas_forecast: number;
  confianca: number;
  fatores: string[];
}

interface Benchmark {
  seu_cpm: string;
  industria_cpm: string;
  seu_cpc: string;
  industria_cpc: string;
  seu_roas: string;
  industria_roas: string;
  posicao_cpm: string;
  posicao_cpc: string;
  posicao_roas: string;
}

type PeriodType = 'last_7d' | 'last_30d' | 'last_90d';

export default function RelatorioClienteDashboard() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('last_30d');
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null);
  const [insights, setInsights] = useState<InsightsCampanha | null>(null);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    carregarClientes();
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
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

      const [resResumo, resInsights, resPrevisao, resBenchmark] = await Promise.all([
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/resumo?periodo=${period}`, { credentials: 'include' }),
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/analise-ia`, { credentials: 'include' }),
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/previsoes`, { credentials: 'include' }),
        fetch(`/api/admin/clientes/${clienteSelecionado}/relatorio/benchmarks`, { credentials: 'include' }),
      ]);

      if (resResumo.ok) {
        const dataResumo = await resResumo.json();
        setResumo(dataResumo);
      }

      if (resInsights.ok) {
        const dataInsights = await resInsights.json();
        setInsights(dataInsights);
      }

      if (resPrevisao.ok) {
        const dataPrevisao = await resPrevisao.json();
        setPrevisao(dataPrevisao);
      }

      if (resBenchmark.ok) {
        const dataBenchmark = await resBenchmark.json();
        setBenchmark(dataBenchmark);
      }
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error(err);
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

      {/* Header */}
      <div style={{ backgroundColor: c.bg.secondary, borderBottom: `1px solid ${c.border}`, padding: `${spacing.md} ${spacing.lg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: shadows.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.primary }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ ...typography.heading, margin: 0 }}>Análise de Clientes</h1>
            <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0 }}>Relatórios e Insights de IA</p>
          </div>
        </div>

        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.secondary, padding: spacing.sm }}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: spacing.lg, background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 100%)` }}>
        {error && (
          <div style={{ backgroundColor: c.error + '20', color: c.error, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, border: `1px solid ${c.error}40` }}>
            ⚠️ {error}
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
            {/* Seletor de Cliente e Período */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
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
            </div>

            {/* Relatório */}
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
                      <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>ROAS</h3>
                      <Zap size={18} color="#fbbf24" />
                    </div>
                    <p style={{ ...typography.heading, margin: 0, color: '#fbbf24' }}>{resumo.resumo.roas.toFixed(2)}x</p>
                  </div>

                  <div style={{ ...glassMorphism[theme], borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                      <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary }}>Investimento</h3>
                      <Target size={18} color={c.accent} />
                    </div>
                    <p style={{ ...typography.heading, margin: 0, color: c.accent }}>{formatarMoeda(resumo.resumo.spend)}</p>
                  </div>
                </div>

                {/* IA Insights */}
                {insights && (
                  <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                    <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md }}>🤖 Análise com IA</h2>

                    {insights.oportunidades.length > 0 && (
                      <div style={{ marginBottom: spacing.lg }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: spacing.sm }}>✓ Oportunidades</h3>
                        <ul style={{ margin: 0, paddingLeft: spacing.lg, listStyle: 'none' }}>
                          {insights.oportunidades.map((item, i) => (
                            <li key={i} style={{ padding: `${spacing.xs} 0`, fontSize: '13px' }}>
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insights.alertas.length > 0 && (
                      <div style={{ marginBottom: spacing.lg }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', color: c.error, marginBottom: spacing.sm }}>⚠️ Alertas</h3>
                        <ul style={{ margin: 0, paddingLeft: spacing.lg, listStyle: 'none' }}>
                          {insights.alertas.map((item, i) => (
                            <li key={i} style={{ padding: `${spacing.xs} 0`, fontSize: '13px' }}>
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Insights */}
                {resumo.analise.insights.length > 0 && (
                  <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}`, marginBottom: spacing.lg }}>
                    <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md }}>💡 Insights</h2>
                    {resumo.analise.insights.map((insight, i) => (
                      <div key={i} style={{ padding: spacing.md, backgroundColor: c.bg.tertiary, borderRadius: radius.md, fontSize: '13px', marginBottom: spacing.md, borderLeft: `3px solid ${c.accent}` }}>
                        {insight}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recomendações */}
                {resumo.analise.recomendacoes.length > 0 && (
                  <div style={{ backgroundColor: c.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, boxShadow: shadows.md, border: `1px solid ${c.border}` }}>
                    <h2 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md }}>🎯 Recomendações</h2>
                    {resumo.analise.recomendacoes.map((rec, i) => (
                      <div key={i} style={{ padding: spacing.md, backgroundColor: c.bg.tertiary, borderRadius: radius.md, fontSize: '13px', marginBottom: spacing.md, borderLeft: `3px solid #fbbf24` }}>
                        {rec}
                      </div>
                    ))}
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
