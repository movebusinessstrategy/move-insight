import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Plus, Edit2, Trash2, X, ArrowLeft, Check } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, keyframes } from '../theme';
import type { Theme } from '../theme';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  fornecedor_nome?: string;
  categoria?: string;
}

interface ContasPagarPageProps {
  user: { id: string; email: string; nome: string; role: 'admin' };
}

export default function ContasPagarPage({ user }: ContasPagarPageProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'pago' | 'atrasado'>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    status: 'pendente',
    categoria: '',
  });

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    carregarContas();
  }, []);

  const carregarContas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/contas-pagar', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setContas(data.contas || []);
      }
    } catch (_err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#f59e0b';
      case 'pago': return '#10b981';
      case 'atrasado': return '#ef4444';
      case 'cancelado': return '#6b7280';
      default: return c.text.primary;
    }
  };

  const handleSave = async () => {
    if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/contas-pagar/${editingId}` : '/api/admin/contas-pagar';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          valor: parseFloat(formData.valor),
        }),
      });
      if (response.ok) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ descricao: '', valor: '', data_vencimento: '', status: 'pendente', categoria: '' });
        carregarContas();
      }
    } catch (_err) {
      alert('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const response = await fetch(`/api/admin/contas-pagar/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        carregarContas();
      }
    } catch (_err) {
      alert('Erro ao deletar');
    }
  };

  const handleMarcarComoPago = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/contas-pagar/${id}/pagar`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        carregarContas();
      }
    } catch (_err) {
      alert('Erro ao marcar como pago');
    }
  };

  const handleEdit = (conta: ContaPagar) => {
    setEditingId(conta.id);
    setFormData({
      descricao: conta.descricao,
      valor: String(conta.valor),
      data_vencimento: conta.data_vencimento,
      status: conta.status,
      categoria: conta.categoria || '',
    });
    setShowForm(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST', credentials: 'include' });
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

  const filteredContas = statusFilter === 'todos' ? contas : contas.filter(c => c.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: c.bg.primary, color: c.text.primary }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            onClick={() => navigate('/financeiro')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.text.primary,
              padding: spacing.sm,
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <img src={theme === 'light' ? logoLight : logoDark} alt="Logo" style={{ height: '32px' }} />
          <h1 style={{ ...typography.heading, margin: 0, fontSize: '20px' }}>Contas a Pagar</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.secondary, padding: spacing.sm }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.text.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: spacing.lg, background: `linear-gradient(135deg, ${c.bg.primary} 0%, ${c.bg.secondary} 50%)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <h2 style={{ ...typography.heading, margin: 0 }}>Lista de Contas a Pagar</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ descricao: '', valor: '', data_vencimento: '', status: 'pendente', categoria: '' });
              setShowForm(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: c.accent,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            <Plus size={18} />
            Nova Conta
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
          {['todos', 'pendente', 'pago', 'atrasado'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radius.md,
                border: `1px solid ${c.border}`,
                backgroundColor: statusFilter === status ? c.accent : 'transparent',
                color: statusFilter === status ? '#FFFFFF' : c.text.primary,
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: spacing.lg }}>Carregando...</div>
        ) : (
          <div style={{
            backgroundColor: c.bg.secondary,
            borderRadius: radius.lg,
            boxShadow: shadows.md,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: c.bg.tertiary, borderBottom: `1px solid ${c.border}` }}>
                  <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary }}>Descrição</th>
                  <th style={{ textAlign: 'right', padding: spacing.md, color: c.text.secondary }}>Valor</th>
                  <th style={{ textAlign: 'center', padding: spacing.md, color: c.text.secondary }}>Vencimento</th>
                  <th style={{ textAlign: 'center', padding: spacing.md, color: c.text.secondary }}>Status</th>
                  <th style={{ textAlign: 'center', padding: spacing.md, color: c.text.secondary }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContas.map((conta) => (
                  <tr key={conta.id} style={{ borderBottom: `1px solid ${c.border}`, transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = c.bg.tertiary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: spacing.md, fontWeight: '600' }}>{conta.descricao}</td>
                    <td style={{ padding: spacing.md, textAlign: 'right', fontWeight: '600' }}>
                      {formatarMoeda(conta.valor)}
                    </td>
                    <td style={{ padding: spacing.md, textAlign: 'center' }}>
                      {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: spacing.md, textAlign: 'center' }}>
                      <span style={{
                        padding: `${spacing.xs} ${spacing.sm}`,
                        backgroundColor: getStatusColor(conta.status) + '33',
                        color: getStatusColor(conta.status),
                        borderRadius: radius.md,
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}>
                        {conta.status}
                      </span>
                    </td>
                    <td style={{ padding: spacing.md, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: spacing.sm }}>
                      {conta.status === 'pendente' && (
                        <button
                          onClick={() => handleMarcarComoPago(conta.id)}
                          title="Marcar como Pago"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#10b981',
                            padding: spacing.xs,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(conta)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: c.accent,
                          padding: spacing.xs,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(conta.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: spacing.xs,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: c.bg.secondary,
            borderRadius: radius.lg,
            padding: spacing.lg,
            maxWidth: '500px',
            width: '90%',
            boxShadow: shadows.lg,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <h3 style={{ ...typography.heading, margin: 0 }}>
                {editingId ? 'Editar' : 'Nova'} Conta a Pagar
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.secondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {[
                { field: 'descricao', label: 'Descrição' },
                { field: 'valor', label: 'Valor', type: 'number' },
                { field: 'data_vencimento', label: 'Vencimento', type: 'date' },
                { field: 'status', label: 'Status', type: 'select', options: ['pendente', 'pago', 'atrasado', 'cancelado'] },
                { field: 'categoria', label: 'Categoria' },
              ].map(({ field, label, type, options }) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: c.text.secondary,
                  }}>
                    {label}
                  </label>
                  {type === 'select' ? (
                    <select
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      style={{
                        padding: spacing.sm,
                        borderRadius: radius.md,
                        border: `1px solid ${c.border}`,
                        backgroundColor: c.bg.tertiary,
                        color: c.text.primary,
                        fontSize: '14px',
                      }}
                    >
                      {options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type || 'text'}
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      style={{
                        padding: spacing.sm,
                        borderRadius: radius.md,
                        border: `1px solid ${c.border}`,
                        backgroundColor: c.bg.tertiary,
                        color: c.text.primary,
                        fontSize: '14px',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  backgroundColor: c.accent,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  backgroundColor: c.bg.tertiary,
                  color: c.text.primary,
                  border: `1px solid ${c.border}`,
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
