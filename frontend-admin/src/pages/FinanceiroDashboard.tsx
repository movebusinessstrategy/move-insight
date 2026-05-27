import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, AlertCircle, Plus, ArrowRight, Users, Calendar } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, animations, keyframes, glassMorphism } from '../theme';
import { getPageStyles } from '../styles/global';
import type { Theme } from '../theme';
import Header from '../components/Header';

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
  const styles = getPageStyles(theme);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSidebarOpen(!e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    setSidebarOpen(!mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', handleMediaChange);
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

      <Header
        theme={theme}
        onThemeChange={setTheme}
        onLogout={handleLogout}
        title="Financeiro"
        subtitle="Controle de receitas e despesas"
        showBackButton
        onBack={() => navigate('/dashboard')}
      />

      {/* Sidebar + Content Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: '200px',
            backgroundColor: c.bg.secondary,
            borderRight: `1px solid ${c.border}`,
            padding: spacing.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
            overflowY: 'auto',
          }}>
          </div>
        )}

        {/* Main Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: spacing.lg,
          background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%)`,
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
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}>
            <AlertCircle size={18} />
            {error}
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
              <div style={styles.card}>
                <h3 style={{ ...styles.title, marginTop: 0, marginBottom: spacing.md }}>Próximas Contas a Vencer</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                        <th style={styles.tableHeader}>Descrição</th>
                        <th style={styles.tableHeader}>Fornecedor</th>
                        <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Valor</th>
                        <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Vencimento</th>
                        <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Dias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.proximasContas.map((conta) => (
                        <tr key={conta.id} style={styles.tableRow}>
                          <td style={styles.tableRow}>{conta.descricao}</td>
                          <td style={styles.tableRow}>{conta.fornecedor_nome}</td>
                          <td style={{ ...styles.tableRow, textAlign: 'right', fontWeight: '600' }}>
                            {formatarMoeda(conta.valor)}
                          </td>
                          <td style={{ ...styles.tableRow, textAlign: 'center' }}>
                            {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{
                            ...styles.tableRow,
                            textAlign: 'center',
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
                    ...styles.button('primary'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
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
    </div>
  );
}
