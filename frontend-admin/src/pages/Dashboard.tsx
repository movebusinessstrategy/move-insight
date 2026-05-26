import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Users, MessageSquare, BarChart3, LogOut, Plus, Edit2, Eye, Bell, Send, Settings, Download, Trash2, Filter, Search, Menu } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, glassMorphism, animations, keyframes } from '../theme';
import type { Theme } from '../theme';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

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
  valor_mensal: string | number | null;
  dia_vencimento: number | null;
  status: string;
  report_frequency: string;
  billing_reminder_active: boolean;
  meta_ads_account_id?: string;
  relatorio_frequencia?: string;
  whatsapp_numero?: string;
}

interface Campanha {
  nome: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  spend: number;
}

interface Relatorio {
  periodo: string;
  campanhas: Campanha[];
  resumo: {
    totalSpend: number;
    totalCliques: number;
    totalConversoes: number;
    roas: number;
  };
}

type TabType = 'clientes' | 'whatsapp' | 'meta-ads';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('clientes');
  const [whatsappStatus, setWhatsappStatus] = useState<'desconectado' | 'conectando' | 'conectado'>('desconectado');
  const [whatsappQrImage, setWhatsappQrImage] = useState<string | null>(null);
  const [whatsappPollingActive, setWhatsappPollingActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    email: '',
    valor_mensal: '',
    dia_vencimento: '',
    status: 'ativo',
    whatsapp_numero: '',
    meta_ads_account_id: '',
    relatorio_frequencia: 'nunca',
    billing_reminder_active: false,
  });

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }, []);

  const openEditModal = (cliente: Cliente) => {
    setEditingClient(cliente);
    setEditForm({
      nome: cliente.nome,
      email: cliente.email,
      valor_mensal: String(cliente.valor_mensal || ''),
      dia_vencimento: String(cliente.dia_vencimento || ''),
      status: cliente.status || 'ativo',
      whatsapp_numero: cliente.whatsapp_numero || '',
      meta_ads_account_id: cliente.meta_ads_account_id || '',
      relatorio_frequencia: cliente.relatorio_frequencia || 'nunca',
      billing_reminder_active: cliente.billing_reminder_active || false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    try {
      const response = await fetch(`/api/admin/clientes/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nome: editForm.nome,
          email: editForm.email,
          valor_mensal: parseFloat(editForm.valor_mensal) || null,
          dia_vencimento: parseInt(editForm.dia_vencimento) || null,
          status: editForm.status,
          whatsapp_numero: editForm.whatsapp_numero || null,
          meta_ads_account_id: editForm.meta_ads_account_id || null,
          relatorio_frequencia: editForm.relatorio_frequencia,
          billing_reminder_active: editForm.billing_reminder_active,
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setClientes(clientes.map(c => c.id === editingClient.id ? updated.cliente : c));
        setEditingClient(null);
      } else {
        alert('Erro ao salvar cliente');
      }
    } catch (err) {
      alert('Erro ao conectar');
    }
  };

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const response = await fetch('/api/admin/clientes', { credentials: 'include' });
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

  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp/status', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setWhatsappStatus(data.connected ? 'conectado' : 'desconectado');
        }
      } catch (error) {
        console.error('Erro ao verificar status WhatsApp:', error);
      }
    };
    checkWhatsAppStatus();
  }, []);

  const handleConectarWhatsApp = async () => {
    try {
      setWhatsappStatus('conectando');
      setWhatsappQrImage(null);
      setWhatsappPollingActive(true);

      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        setWhatsappStatus('desconectado');
        setWhatsappPollingActive(false);
        return;
      }

      let pollingAttempts = 0;
      const maxAttempts = 60;
      let shouldContinuePolling = true;

      const pollQrCode = async () => {
        while (pollingAttempts < maxAttempts && shouldContinuePolling) {
          try {
            const qrResponse = await fetch('/api/whatsapp/qr', { credentials: 'include' });
            if (qrResponse.ok) {
              const qrData = await qrResponse.json();
              if (qrData.qr) {
                setWhatsappQrImage(qrData.qr);
              }
            }

            const statusResponse = await fetch('/api/whatsapp/status', { credentials: 'include' });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.connected) {
                setWhatsappStatus('conectado');
                setWhatsappQrImage(null);
                setWhatsappPollingActive(false);
                shouldContinuePolling = false;
                return;
              }
            }

            pollingAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (_error) {
            pollingAttempts++;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (shouldContinuePolling) {
          setWhatsappStatus('desconectado');
          setWhatsappPollingActive(false);
        }
      };

      pollQrCode();
    } catch (_error) {
      setWhatsappStatus('desconectado');
      setWhatsappPollingActive(false);
    }
  };

  const handleDesconectarWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/disconnect', { method: 'POST', credentials: 'include' });
      setWhatsappStatus('desconectado');
      setWhatsappQrImage(null);
      setWhatsappPollingActive(false);
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
    }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || cliente.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const metricas = {
    totalClientes: clientes.length,
    clientesAtivos: clientes.filter((c) => c.status === 'ativo').length,
    faturamentoTotal: clientes.reduce((sum, c) => sum + (c.valor_mensal ? Number(c.valor_mensal) : 0), 0),
    comMetaAds: clientes.filter((c) => c.meta_ads_account_id).length,
  };

  const handleLogout = async () => {
    await fetch('/api/auth/admin/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  };

  return (
    <div style={{
      backgroundColor: c.bg.primary,
      color: c.text.primary,
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
      transition: 'background-color 0.3s, color 0.3s',
    }}>
      {/* Header */}
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
        minHeight: '100px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <img
            src={theme === 'light' ? logoLight : logoDark}
            alt="MOVE Insights"
            style={{
              height: '80px',
              width: 'auto',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
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
              backgroundColor: c.bg.secondary,
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
        display: 'flex',
        height: 'calc(100vh - 100px)',
        background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%, ${c.bg.tertiary} 100%)`,
        backgroundSize: '200% 200%',
        ...animations.gradientShift,
      }}>
        {/* Sidebar */}
        <div style={{
          width: '200px',
          backgroundColor: c.bg.secondary,
          borderRight: `1px solid ${c.border}`,
          padding: spacing.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}>
          {[
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'meta-ads', label: 'Meta Ads', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              style={{
                background: activeTab === id ? c.accent : 'transparent',
                color: activeTab === id ? '#FFFFFF' : c.text.primary,
                border: 'none',
                borderRadius: radius.md,
                padding: `${spacing.sm} ${spacing.md}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (activeTab !== id) {
                  e.currentTarget.style.backgroundColor = c.bg.tertiary;
                  e.currentTarget.style.boxShadow = `inset 0 0 12px ${c.accent}33`;
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: spacing.lg,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          {/* Clientes Tab */}
          {activeTab === 'clientes' && (
            <div style={{ ...animations.slideUp }}>
              <h2 style={{
                ...typography.heading,
                margin: `0 0 ${spacing.lg} 0`,
                animation: 'slideUp 0.5s ease-out',
              }}>Clientes</h2>

              {/* Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: spacing.md,
                marginBottom: spacing.lg,
                animation: 'slideUp 0.5s ease-out',
              }}>
                {[
                  { label: 'Total', value: metricas.totalClientes, icon: Users, color: '#007AFF' },
                  { label: 'Ativos', value: metricas.clientesAtivos, icon: Users, color: '#34C759' },
                  { label: 'Faturamento', value: `R$ ${metricas.faturamentoTotal.toFixed(2)}`, icon: BarChart3, color: '#FF9500' },
                  { label: 'Com Meta Ads', value: metricas.comMetaAds, icon: BarChart3, color: '#5856D6' },
                ].map((metric, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...(theme === 'light' ? glassMorphism.light : glassMorphism.dark),
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing.md,
                      ...animations.slideUp,
                      ...animations.float,
                      transitionDelay: `${idx * 50}ms`,
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
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: radius.md,
                      backgroundColor: metric.color,
                      opacity: 0.15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: metric.color,
                    }}>
                      <metric.icon size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: c.text.secondary, margin: 0, marginBottom: spacing.xs }}>
                        {metric.label}
                      </p>
                      <p style={{ ...typography.subheading, margin: 0 }}>
                        {metric.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search and Filter */}
              <div style={{
                display: 'flex',
                gap: spacing.md,
                marginBottom: spacing.lg,
                ...animations.slideUp,
                animation: 'slideUp 0.5s ease-out 0.1s backwards',
              }}>
                <div style={{
                  flex: 1,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <Search size={18} style={{
                    position: 'absolute',
                    left: spacing.md,
                    color: c.text.secondary,
                  }} />
                  <input
                    type="text"
                    placeholder="Procurar cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md} ${spacing.sm} ${spacing.lg}`,
                      paddingLeft: '40px',
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors[theme].accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = c.border;
                    }}
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.md,
                    backgroundColor: c.bg.secondary,
                    color: c.text.primary,
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </select>
              </div>

              {/* Clients Table */}
              <div style={{
                backgroundColor: c.bg.secondary,
                borderRadius: radius.lg,
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
                ...animations.slideUp,
                animation: 'slideUp 0.5s ease-out 0.15s backwards',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                      <th style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Nome
                      </th>
                      <th style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Email
                      </th>
                      <th style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Valor
                      </th>
                      <th style={{
                        padding: spacing.md,
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Status
                      </th>
                      <th style={{
                        padding: spacing.md,
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: c.text.secondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((cliente) => (
                      <tr
                        key={cliente.id}
                        style={{
                          borderBottom: `1px solid ${c.border}`,
                          transition: 'background-color 0.2s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = c.bg.tertiary;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{
                          padding: spacing.md,
                          fontSize: '14px',
                          fontWeight: '500',
                        }}>
                          {cliente.nome}
                        </td>
                        <td style={{
                          padding: spacing.md,
                          fontSize: '14px',
                          color: c.text.secondary,
                        }}>
                          {cliente.email}
                        </td>
                        <td style={{
                          padding: spacing.md,
                          fontSize: '14px',
                          fontWeight: '500',
                        }}>
                          {cliente.valor_mensal ? `R$ ${Number(cliente.valor_mensal).toFixed(2)}` : '—'}
                        </td>
                        <td style={{
                          padding: spacing.md,
                          fontSize: '14px',
                        }}>
                          <span style={{
                            backgroundColor: cliente.status === 'ativo' ? colors[theme].success : colors[theme].error,
                            color: '#FFFFFF',
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: radius.md,
                            fontSize: '12px',
                            fontWeight: '500',
                            opacity: 0.8,
                          }}>
                            {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{
                          padding: spacing.md,
                          textAlign: 'center',
                          display: 'flex',
                          justifyContent: 'center',
                          gap: spacing.sm,
                        }}>
                          <button
                            onClick={() => navigate(`/dashboard/cliente/${cliente.id}`)}
                            style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: c.text.secondary,
                            padding: spacing.sm,
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s',
                          }}
                            onMouseOver={(e) => e.currentTarget.style.color = c.accent}
                            onMouseOut={(e) => e.currentTarget.style.color = c.text.secondary}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(cliente)}
                            style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: c.text.secondary,
                            padding: spacing.sm,
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.2s',
                          }}
                            onMouseOver={(e) => e.currentTarget.style.color = colors[theme].warning}
                            onMouseOut={(e) => e.currentTarget.style.color = c.text.secondary}
                          >
                            <Edit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WhatsApp Tab */}
          {activeTab === 'whatsapp' && (
            <div style={{ ...animations.slideUp }}>
              <h2 style={{
                ...typography.heading,
                margin: `0 0 ${spacing.lg} 0`,
                animation: 'slideUp 0.5s ease-out',
              }}>WhatsApp</h2>

              <div style={{
                backgroundColor: c.bg.secondary,
                borderRadius: radius.lg,
                border: `1px solid ${c.border}`,
                padding: spacing.lg,
                textAlign: 'center',
                maxWidth: '500px',
                margin: '0 auto',
                ...animations.slideUp,
              }}>
                {whatsappStatus === 'desconectado' && (
                  <div>
                    <MessageSquare size={48} style={{
                      color: c.text.secondary,
                      marginBottom: spacing.md,
                      opacity: 0.5,
                    }} />
                    <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.sm} 0` }}>
                      WhatsApp Desconectado
                    </h3>
                    <p style={{
                      color: c.text.secondary,
                      margin: `0 0 ${spacing.lg} 0`,
                      fontSize: '14px',
                    }}>
                      Conecte sua conta para disparar lembretes e relatórios automaticamente.
                    </p>
                    <button
                      onClick={handleConectarWhatsApp}
                      style={{
                        backgroundColor: '#25D366',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: radius.md,
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <MessageSquare size={18} />
                      Conectar WhatsApp
                    </button>
                  </div>
                )}

                {whatsappStatus === 'conectando' && (
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: `3px solid ${c.border}`,
                      borderTopColor: colors[theme].accent,
                      margin: `0 auto ${spacing.md}`,
                      animation: 'spin 1s linear infinite',
                    }} />
                    <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.sm} 0` }}>
                      Conectando...
                    </h3>
                    <p style={{
                      color: c.text.secondary,
                      margin: `0 0 ${spacing.lg} 0`,
                      fontSize: '14px',
                    }}>
                      Escaneie o código QR com seu WhatsApp
                    </p>

                    {whatsappQrImage && (
                      <div style={{
                        backgroundColor: c.bg.primary,
                        borderRadius: radius.md,
                        padding: spacing.lg,
                        marginBottom: spacing.lg,
                      }}>
                        <img
                          src={whatsappQrImage}
                          alt="QR Code"
                          style={{
                            maxWidth: '300px',
                            width: '100%',
                            margin: '0 auto',
                            display: 'block',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {whatsappStatus === 'conectado' && (
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: colors[theme].success,
                      margin: `0 auto ${spacing.md}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.2,
                      ...animations.glow,
                    }}>
                      <MessageSquare size={24} />
                    </div>
                    <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.sm} 0`, color: colors[theme].success }}>
                      Conectado!
                    </h3>
                    <p style={{
                      color: c.text.secondary,
                      margin: `0 0 ${spacing.lg} 0`,
                      fontSize: '14px',
                    }}>
                      Sua conta WhatsApp está pronta para disparar mensagens.
                    </p>
                    <button
                      onClick={handleDesconectarWhatsApp}
                      style={{
                        backgroundColor: colors[theme].error,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: radius.md,
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      Desconectar
                    </button>
                  </div>
                )}

                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            </div>
          )}

          {/* Meta Ads Tab */}
          {activeTab === 'meta-ads' && (
            <div style={{ ...animations.slideUp }}>
              <h2 style={{
                ...typography.heading,
                margin: `0 0 ${spacing.lg} 0`,
                animation: 'slideUp 0.5s ease-out',
              }}>Meta Ads</h2>
              <div style={{
                backgroundColor: c.bg.secondary,
                borderRadius: radius.lg,
                border: `1px solid ${c.border}`,
                padding: spacing.lg,
                textAlign: 'center',
                color: c.text.secondary,
                ...animations.slideUp,
              }}>
                <BarChart3 size={48} style={{
                  margin: `0 auto ${spacing.md}`,
                  opacity: 0.5,
                }} />
                <p style={{ fontSize: '14px' }}>Em desenvolvimento</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {/* Edit Modal */}
      {editingClient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          overflowY: 'auto',
        }} onClick={() => setEditingClient(null)}>
          <div style={{
            backgroundColor: c.bg.primary,
            borderRadius: radius.lg,
            border: `1px solid ${c.border}`,
            padding: spacing.xl,
            maxWidth: '600px',
            width: '90%',
            margin: spacing.xl,
            ...glassMorphism[theme === 'light' ? 'light' : 'dark'],
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...typography.heading, margin: `0 0 ${spacing.lg} 0` }}>
              Editar Cliente
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Dados Básicos */}
              <div style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: spacing.lg }}>
                <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.md} 0`, fontSize: '14px' }}>
                  Dados Básicos
                </h3>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      marginBottom: spacing.md,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      marginBottom: spacing.md,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Dados Financeiros */}
              <div style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: spacing.lg }}>
                <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.md} 0`, fontSize: '14px' }}>
                  Dados Financeiros
                </h3>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.valor_mensal}
                    onChange={(e) => setEditForm({ ...editForm, valor_mensal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      marginBottom: spacing.md,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.dia_vencimento}
                    onChange={(e) => setEditForm({ ...editForm, dia_vencimento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      marginBottom: spacing.md,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <input
                    type="checkbox"
                    checked={editForm.billing_reminder_active}
                    onChange={(e) => setEditForm({ ...editForm, billing_reminder_active: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label style={{ ...typography.small, margin: 0, cursor: 'pointer' }}>
                    Lembrete de Cobrança Ativo
                  </label>
                </div>
              </div>

              {/* Integração Meta Ads */}
              <div style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: spacing.lg }}>
                <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.md} 0`, fontSize: '14px' }}>
                  Integração Meta Ads
                </h3>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    ID da Conta Meta Ads
                  </label>
                  <input
                    type="text"
                    value={editForm.meta_ads_account_id}
                    onChange={(e) => setEditForm({ ...editForm, meta_ads_account_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="123456789"
                  />
                </div>
              </div>

              {/* Integração WhatsApp */}
              <div style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: spacing.lg }}>
                <h3 style={{ ...typography.subheading, margin: `0 0 ${spacing.md} 0`, fontSize: '14px' }}>
                  Integração WhatsApp
                </h3>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Número WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editForm.whatsapp_numero}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp_numero: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      marginBottom: spacing.md,
                    }}
                    placeholder="55 11 99999-9999"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', ...typography.small, marginBottom: spacing.sm, fontWeight: '500' }}>
                    Frequência de Relatórios
                  </label>
                  <select
                    value={editForm.relatorio_frequencia}
                    onChange={(e) => setEditForm({ ...editForm, relatorio_frequencia: e.target.value })}
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      border: `1px solid ${c.border}`,
                      borderRadius: radius.md,
                      backgroundColor: c.bg.secondary,
                      color: c.text.primary,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="nunca">Nunca</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
                <button
                  onClick={() => setEditingClient(null)}
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    border: `1px solid ${c.border}`,
                    borderRadius: radius.md,
                    backgroundColor: c.bg.secondary,
                    color: c.text.primary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    border: 'none',
                    borderRadius: radius.md,
                    backgroundColor: c.accent,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed',
          bottom: spacing.lg,
          right: spacing.lg,
          backgroundColor: colors[theme].error,
          color: '#FFFFFF',
          padding: `${spacing.md} ${spacing.lg}`,
          borderRadius: radius.md,
          fontSize: '14px',
          zIndex: 1000,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
