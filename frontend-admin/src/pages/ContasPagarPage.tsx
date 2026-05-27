import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Plus, Edit2, Trash2, X, ArrowLeft, Check } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, keyframes } from '../theme';
import { getPageStyles } from '../styles/global';
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
  fornecedor_id?: string;
  categoria?: string;
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface ContasPagarPageProps {
  user: { id: string; email: string; nome: string; role: 'admin' };
}

export default function ContasPagarPage({ user }: ContasPagarPageProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
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
    fornecedor_id: '',
  });

  const c = colors[theme];
  const styles = getPageStyles(theme);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    carregarFornecedores();
    carregarContas();
  }, []);

  const carregarFornecedores = async () => {
    try {
      const response = await fetch('/api/admin/fornecedores', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setFornecedores(data.fornecedores || []);
      }
    } catch (_err) {
      // Error handling
    }
  };

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
    if (!formData.descricao || !formData.valor || !formData.data_vencimento || !formData.fornecedor_id) {
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
        setFormData({ descricao: '', valor: '', data_vencimento: '', status: 'pendente', categoria: '', fornecedor_id: '' });
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
      fornecedor_id: conta.fornecedor_id || '',
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
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
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
          <h1 style={{ ...typography.subheading, margin: 0 }}>Contas a Pagar</h1>
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
      <div style={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <h2 style={styles.title}>Lista de Contas a Pagar</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ descricao: '', valor: '', data_vencimento: '', status: 'pendente', categoria: '', fornecedor_id: '' });
              setShowForm(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              ...styles.button('primary'),
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
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: c.bg.tertiary, borderBottom: `1px solid ${c.border}` }}>
                  <th style={styles.tableHeader}>Descrição</th>
                  <th style={styles.tableHeader}>Fornecedor</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Valor</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Vencimento</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Status</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContas.map((conta) => (
                  <tr key={conta.id} style={styles.tableRow}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = c.bg.tertiary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ ...styles.tableRow, fontWeight: '600' }}>{conta.descricao}</td>
                    <td style={styles.tableRow}>{conta.fornecedor_nome || '-'}</td>
                    <td style={{ ...styles.tableRow, textAlign: 'right', fontWeight: '600' }}>
                      {formatarMoeda(conta.valor)}
                    </td>
                    <td style={{ ...styles.tableRow, textAlign: 'center' }}>
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
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <h3 style={styles.title}>
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
                { field: 'fornecedor_id', label: 'Fornecedor *', type: 'supplier-select' },
                { field: 'descricao', label: 'Descrição' },
                { field: 'valor', label: 'Valor', type: 'number' },
                { field: 'data_vencimento', label: 'Vencimento', type: 'date' },
                { field: 'status', label: 'Status', type: 'select', options: ['pendente', 'pago', 'atrasado', 'cancelado'] },
                { field: 'categoria', label: 'Categoria' },
              ].map(({ field, label, type, options }) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <label style={styles.label}>
                    {label}
                  </label>
                  {type === 'supplier-select' ? (
                    <select
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      style={styles.input}
                    >
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  ) : type === 'select' ? (
                    <select
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      style={styles.input}
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
                      style={styles.input}
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
                  ...styles.button('primary'),
                }}
              >
                Salvar
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  ...styles.button('secondary'),
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
