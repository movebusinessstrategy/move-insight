import { useState, useEffect } from 'react';
import { Save, LogOut, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import type { Cliente } from '../Router';

interface Contexto {
  id: string;
  cliente_id: string;
  descricao_empresa: string | null;
  produtos_servicos: string | null;
  localizacao: string | null;
  estrategia: string | null;
  tom_marca: string | null;
  publico_alvo: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  descricao_empresa: string;
  produtos_servicos: string;
  localizacao: string;
  estrategia: string;
  tom_marca: string;
  publico_alvo: string;
}

export default function ClienteContexto({ cliente }: { cliente: Cliente }) {
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [formData, setFormData] = useState<FormData>({
    descricao_empresa: '',
    produtos_servicos: '',
    localizacao: '',
    estrategia: '',
    tom_marca: '',
    publico_alvo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchContexto();
  }, []);

  const fetchContexto = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cliente/contexto', {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao carregar contexto');
      }

      const data: Contexto = await response.json();
      setContexto(data);
      setFormData({
        descricao_empresa: data.descricao_empresa || '',
        produtos_servicos: data.produtos_servicos || '',
        localizacao: data.localizacao || '',
        estrategia: data.estrategia || '',
        tom_marca: data.tom_marca || '',
        publico_alvo: data.publico_alvo || '',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar contexto';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/cliente/contexto', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar contexto');
      }

      const data = await response.json();
      setContexto(data.contexto);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar contexto';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/cliente/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/login';
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Carregando contexto...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Contexto da Empresa
        </h1>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#c33',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#363',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>Contexto salvo com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {/* Descrição da Empresa */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Descrição da Empresa
            </label>
            <textarea
              name="descricao_empresa"
              value={formData.descricao_empresa}
              onChange={handleChange}
              placeholder="Breve descrição da sua empresa, missão e visão..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Produtos e Serviços */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Produtos e Serviços
            </label>
            <textarea
              name="produtos_servicos"
              value={formData.produtos_servicos}
              onChange={handleChange}
              placeholder="Descreva os principais produtos e serviços que você oferece..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Localização */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Localização
            </label>
            <input
              type="text"
              name="localizacao"
              value={formData.localizacao}
              onChange={handleChange}
              placeholder="Cidade, Estado ou região de atuação..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Estratégia */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Estratégia de Negócio
            </label>
            <textarea
              name="estrategia"
              value={formData.estrategia}
              onChange={handleChange}
              placeholder="Descreva sua estratégia de crescimento e marketing..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tom de Marca */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Tom de Marca
            </label>
            <input
              type="text"
              name="tom_marca"
              value={formData.tom_marca}
              onChange={handleChange}
              placeholder="Ex: Profissional, Descontraído, Inovador, Tradicional..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Público Alvo */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
            }}>
              Público Alvo
            </label>
            <textarea
              name="publico_alvo"
              value={formData.publico_alvo}
              onChange={handleChange}
              placeholder="Descreva quem é seu cliente ideal: idade, profissão, interesses, dores..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              backgroundColor: saving ? '#ccc' : '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Contexto'}
          </button>
        </form>

        {/* Info Footer */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          color: '#1e40af',
          fontSize: '13px',
          lineHeight: '1.6',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <Lightbulb size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Dica:</strong> Preencha esses campos com informações sobre sua empresa para que a IA possa gerar sugestões de criativos mais personalizadas e relevantes para seu negócio.
          </div>
        </div>
      </div>
    </div>
  );
}
