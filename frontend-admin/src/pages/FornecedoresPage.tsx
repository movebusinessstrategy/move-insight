import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, keyframes } from '../theme';
import type { Theme } from '../theme';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

interface Fornecedor {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cnpj_cpf?: string;
  categoria?: string;
  status: string;
}

interface FornecedoresPageProps {
  user: { id: string; email: string; nome: string; role: 'admin' };
}

export default function FornecedoresPage({ user }: FornecedoresPageProps) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cnpj_cpf: '',
    categoria: '',
  });

  const c = colors[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/fornecedores', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFornecedores(data.fornecedores || []);
      }
    } catch (_err) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome) {
      alert('Nome é obrigatório');
      return;
    }
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/fornecedores/${editingId}` : '/api/admin/fornecedores';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ nome: '', email: '', telefone: '', cnpj_cpf: '', categoria: '' });
        carregarFornecedores();
      }
    } catch (_err) {
      alert('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const response = await fetch(`/api/admin/fornecedores/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        carregarFornecedores();
      }
    } catch (_err) {
      alert('Erro ao deletar');
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingId(fornecedor.id);
    setFormData({
      nome: fornecedor.nome,
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      cnpj_cpf: fornecedor.cnpj_cpf || '',
      categoria: fornecedor.categoria || '',
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
          <h1 style={{ ...typography.heading, margin: 0, fontSize: '20px' }}>Fornecedores</h1>
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
          <h2 style={{ ...typography.heading, margin: 0 }}>Lista de Fornecedores</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ nome: '', email: '', telefone: '', cnpj_cpf: '', categoria: '' });
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
            Novo
          </button>
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
                  <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary }}>Email</th>
                  <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary }}>Telefone</th>
                  <th style={{ textAlign: 'left', padding: spacing.md, color: c.text.secondary }}>Categoria</th>
                  <th style={{ textAlign: 'center', padding: spacing.md, color: c.text.secondary }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${c.border}`, transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = c.bg.tertiary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: spacing.md, fontWeight: '600' }}>{f.nome}</td>
                    <td style={{ padding: spacing.md }}>{f.email || '-'}</td>
                    <td style={{ padding: spacing.md }}>{f.telefone || '-'}</td>
                    <td style={{ padding: spacing.md }}>{f.categoria || '-'}</td>
                    <td style={{ padding: spacing.md, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: spacing.sm }}>
                      <button
                        onClick={() => handleEdit(f)}
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
                        onClick={() => handleDelete(f.id)}
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
                {editingId ? 'Editar' : 'Novo'} Fornecedor
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text.secondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {['nome', 'email', 'telefone', 'cnpj_cpf', 'categoria'].map((field) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: c.text.secondary,
                    textTransform: 'capitalize',
                  }}>
                    {field === 'cnpj_cpf' ? 'CNPJ/CPF' : field}
                  </label>
                  <input
                    type="text"
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
