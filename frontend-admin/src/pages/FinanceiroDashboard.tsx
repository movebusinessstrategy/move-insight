import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, DollarSign, TrendingUp, AlertCircle, Plus, ArrowRight, Users, Calendar } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, animations, keyframes, glassMorphism } from '../theme';
import type { Theme } from '../theme';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin';
}

interface ResumoFinanceiro {
  periodo: string;
  receita: {
    total: number;
    clientes: number;
    esporadicas: number;
  };
  despesa: {
    total: number;
    pendente: number;
    pago: number;
    atrasado: number;
  };
  saldo: number;
  contasAtrasadas: number;
  proximasContas: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    fornecedor_nome: string;
    dias_faltam: number;
  }>;
}

interface FinanceiroDashboardProps {
  user: User;
}

export default function FinanceiroDashboard({ user }: FinanceiroDashboardProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    carregarResumo();
  }, []);

  const carregarResumo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/financeiro/resumo', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setResumo(data.resumo);
      } else {
        setError('Erro ao carregar resumo financeiro');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login');
    } catch (_err) {
      navigate('/login');
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: c.bg.primary,
      color: c.text.primary,
    }}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={{
        backgroundColor: c.bg.secondary,
        borderBottom: `1px solid ${c.border}`,
        padding: `${spacing.md} ${spacing.lg}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: shadows.sm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <img src={theme === 'light' ? logoLight : logoDark} alt="Logo" style={{ height: '32px' }} />
          <div>
            <h1 style={{ ...typography.body, margin: 0, fontWeight: '600' }}>MOVE Insights</h1>
            <p style={{ fontSize: '12px', color: c.text.secondary, margin: '2px 0 0 0' }}>Financeiro</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.text.secondary,
              padding: spacing.sm,
              borderRadius: radius.md,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = c.bg.tertiary;
              e.currentTarget.style.boxShadow = `0 0 12px ${c.accent}33`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div style={{
            height: '24px',
            width: '1px',
            backgroundColor: c.border,
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: c.bg.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: c.text.secondary,
                padding: spacing.sm,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: '14px',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = c.text.primary;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = c.text.secondary;
              }}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing.lg,
        background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%, ${c.bg.tertiary} 100%)`,
        backgroundSize: '200% 200%',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: spacing.xl }}>Carregando...</div>
        ) : error ? (
          <div style={{
            backgroundColor: c.error + '20',
            color: c.error,
            padding: spacing.md,
            borderRadius: radius.lg,
            marginBottom: spacing.md,
            border: `1px solid ${c.error}40`,
          }}>
            ⚠️ {error}
          </div>
        ) : resumo ? (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: spacing.md,
              marginBottom: spacing.lg,
            }}>
              {/* Card Receita */}
              <div style={{
                ...glassMorphism[theme],
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: theme === 'light' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: c.text.secondary }}>Receita Total</h3>
                  <DollarSign size={20} color="#10b981" />
                </div>
                <p style={{ ...typography.heading, margin: 0, color: '#10b981' }}>
                  {formatarMoeda(resumo.receita.total)}
                </p>
                <p style={{ fontSize: '12px', color: c.text.secondary, margin: `${spacing.sm} 0 0 0` }}>
                  Clientes: {formatarMoeda(resumo.receita.clientes)}
                </p>
                <p style={{ fontSize: '12px', color: c.text.secondary, margin: `${spacing.xs} 0 0 0` }}>
                  Esporádicas: {formatarMoeda(resumo.receita.esporadicas)}
                </p>
              </div>

              {/* Card Despesa */}
              <div style={{
                ...glassMorphism[theme],
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: theme === 'light' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary, fontWeight: '500' }}>Despesa Total</h3>
                  <TrendingUp size={18} color={c.error} />
                </div>
                <p style={{ ...typography.heading, margin: 0, color: c.error }}>
                  {formatarMoeda(resumo.despesa.total)}
                </p>
              </div>

              {/* Card Saldo */}
              <div style={{
                ...glassMorphism[theme],
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: theme === 'light' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: c.text.secondary, fontWeight: '500' }}>Saldo</h3>
                  <DollarSign size={18} color={resumo.saldo >= 0 ? c.success : c.error} />
                </div>
                <p style={{
                  ...typography.heading,
                  margin: 0,
                  color: resumo.saldo >= 0 ? c.success : c.error,
                }}>
                  {formatarMoeda(resumo.saldo)}
                </p>
              </div>

              {/* Card Contas Atrasadas */}
              <div style={{
                ...glassMorphism[theme],
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: theme === 'light' ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: c.text.secondary }}>Contas Atrasadas</h3>
                  <AlertCircle size={20} color={resumo.contasAtrasadas > 0 ? '#f59e0b' : '#10b981'} />
                </div>
                <p style={{
                  ...typography.heading,
                  margin: 0,
                  color: resumo.contasAtrasadas > 0 ? '#f59e0b' : '#10b981',
                }}>
                  {resumo.contasAtrasadas}
                </p>
              </div>
            </div>

            {/* Próximas Contas */}
            {resumo.proximasContas.length > 0 && (
              <div style={{
                backgroundColor: c.bg.secondary,
                borderRadius: radius.lg,
                padding: spacing.lg,
                boxShadow: shadows.md,
                border: `1px solid ${c.border}`,
              }}>
                <h3 style={{ ...typography.heading, marginTop: 0, marginBottom: spacing.md }}>Próximas Contas a Vencer</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                        <th style={{ textAlign: 'left', padding: spacing.sm, color: c.text.secondary }}>Descrição</th>
                        <th style={{ textAlign: 'left', padding: spacing.sm, color: c.text.secondary }}>Fornecedor</th>
                        <th style={{ textAlign: 'right', padding: spacing.sm, color: c.text.secondary }}>Valor</th>
                        <th style={{ textAlign: 'center', padding: spacing.sm, color: c.text.secondary }}>Vencimento</th>
                        <th style={{ textAlign: 'center', padding: spacing.sm, color: c.text.secondary }}>Dias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.proximasContas.map((conta) => (
                        <tr key={conta.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                          <td style={{ padding: spacing.sm }}>{conta.descricao}</td>
                          <td style={{ padding: spacing.sm }}>{conta.fornecedor_nome}</td>
                          <td style={{ textAlign: 'right', padding: spacing.sm, fontWeight: '600' }}>
                            {formatarMoeda(conta.valor)}
                          </td>
                          <td style={{ textAlign: 'center', padding: spacing.sm }}>
                            {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{
                            textAlign: 'center',
                            padding: spacing.sm,
                            color: conta.dias_faltam <= 3 ? '#f59e0b' : c.text.primary,
                            fontWeight: conta.dias_faltam <= 3 ? '600' : '400',
                          }}>
                            {conta.dias_faltam}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: spacing.md,
              marginTop: spacing.lg,
            }}>
              {[
                { label: 'Fornecedores', path: '/fornecedores' },
                { label: 'Contas a Pagar', path: '/contas-pagar' },
                { label: 'Receitas Esporádicas', path: '/receitas-esporadicas' },
              ].map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    backgroundColor: c.accent,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    boxShadow: shadows.md,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = shadows.lg;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = shadows.md;
                  }}
                >
                  <Plus size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
