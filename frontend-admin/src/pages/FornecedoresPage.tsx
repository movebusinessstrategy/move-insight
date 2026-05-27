import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';
import { colors, spacing, radius, typography, shadows, keyframes } from '../theme';
import { getPageStyles } from '../styles/global';
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
  const styles = getPageStyles(theme);

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
          <h1 style={{ ...typography.subheading, margin: 0 }}>Fornecedores</h1>
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
          <h2 style={styles.title}>Lista de Fornecedores</h2>
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
              ...styles.button('primary'),
            }}
          >
            <Plus size={18} />
            Novo
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: spacing.lg }}>Carregando...</div>
        ) : (
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: c.bg.tertiary, borderBottom: `1px solid ${c.border}` }}>
                  <th style={styles.tableHeader}>Nome</th>
                  <th style={styles.tableHeader}>Email</th>
                  <th style={styles.tableHeader}>Telefone</th>
                  <th style={styles.tableHeader}>Categoria</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id} style={styles.tableRow}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = c.bg.tertiary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ ...styles.tableRow, fontWeight: '600' }}>{f.nome}</td>
                    <td style={styles.tableRow}>{f.email || '-'}</td>
                    <td style={styles.tableRow}>{f.telefone || '-'}</td>
                    <td style={styles.tableRow}>{f.categoria || '-'}</td>
                    <td style={{ ...styles.tableRow, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: spacing.sm }}>
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
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <h3 style={styles.title}>
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
                  <label style={styles.label}>
                    {field === 'cnpj_cpf' ? 'CNPJ/CPF' : field}
                  </label>
                  <input
                    type="text"
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    style={styles.input}
                  />
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
