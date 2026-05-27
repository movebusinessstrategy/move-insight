import { useState, useEffect } from 'react';
import {
  Zap, LogOut, Copy, Trash2, History, Loader,
  Lightbulb, Image, MessageCircle, Megaphone, Target,
  AlertCircle, CheckCircle
} from 'lucide-react';
import type { Cliente } from '../Router';

interface Sugestao {
  id: string;
  tipo: string;
  resposta_ia: string;
  created_at: string;
}

type TipoSugestao = 'post_instagram' | 'copy_whatsapp' | 'titulo_anuncio' | 'angulo_venda' | 'geral';

interface TipoDisponivel {
  value: TipoSugestao;
  label: string;
  descricao: string;
  icon: React.ReactNode;
}

const tiposDisponiveis: TipoDisponivel[] = [
  {
    value: 'geral',
    label: 'Geral',
    descricao: 'Ideias gerais de conteúdo e estratégia',
    icon: <Lightbulb size={20} />,
  },
  {
    value: 'post_instagram',
    label: 'Posts Instagram',
    descricao: 'Ideias criativas e copies para Instagram',
    icon: <Image size={20} />,
  },
  {
    value: 'copy_whatsapp',
    label: 'WhatsApp',
    descricao: 'Mensagens persuasivas para WhatsApp',
    icon: <MessageCircle size={20} />,
  },
  {
    value: 'titulo_anuncio',
    label: 'Títulos de Anúncios',
    descricao: 'Títulos persuasivos para Meta Ads',
    icon: <Megaphone size={20} />,
  },
  {
    value: 'angulo_venda',
    label: 'Ângulos de Venda',
    descricao: 'Ângulos únicos e diferenciados',
    icon: <Target size={20} />,
  },
];

export default function Criativos({ cliente }: { cliente: Cliente }) {
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoSugestao>('geral');
  const [sugestoesBuscadas, setSugestoesBuscadas] = useState<Sugestao[]>([]);
  const [historico, setHistorico] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [abaSelecionada, setAbaSelecionada] = useState<'gerar' | 'historico'>('gerar');

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const response = await fetch('/api/cliente/criativos/historico?limite=20', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }

      const data = await response.json();
      setHistorico(data.historico || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const gerarSugestoes = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/cliente/criativos/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tipo: tipoSelecionado }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao gerar sugestões');
      }

      const data = await response.json();
      setSugestoesBuscadas([
        {
          id: Date.now().toString(),
          tipo: data.tipo,
          resposta_ia: data.sugestoes,
          created_at: data.timestamp,
        },
      ]);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      carregarHistorico();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar sugestões';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copiarParaPapeleta = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const deletarSugestao = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta sugestão?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cliente/criativos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar sugestão');
      }

      carregarHistorico();
      setSugestoesBuscadas((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Erro ao deletar:', err);
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

  const obterLabelTipo = (tipo: string): string => {
    const item = tiposDisponiveis.find((t) => t.value === tipo);
    return item?.label || tipo;
  };

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
          <Zap size={28} style={{ display: 'inline-block', marginRight: '8px' }} />
          Gerador de Ideias Criativas
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

      {/* Mensagens */}
      {error && (
        <div style={{
          maxWidth: '900px',
          margin: '16px auto',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          padding: '12px 16px',
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
          maxWidth: '900px',
          margin: '16px auto',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '6px',
          padding: '12px 16px',
          color: '#363',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{abaSelecionada === 'gerar' ? 'Sugestões geradas!' : 'Copiado para papeleta!'}</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {/* Abas */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
          <button
            onClick={() => setAbaSelecionada('gerar')}
            style={{
              backgroundColor: abaSelecionada === 'gerar' ? '#2563eb' : 'transparent',
              color: abaSelecionada === 'gerar' ? '#fff' : '#666',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Zap size={18} />
            Gerar Ideias
          </button>
          <button
            onClick={() => setAbaSelecionada('historico')}
            style={{
              backgroundColor: abaSelecionada === 'historico' ? '#2563eb' : 'transparent',
              color: abaSelecionada === 'historico' ? '#fff' : '#666',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <History size={18} />
            Histórico ({historico.length})
          </button>
        </div>

        {/* Aba: Gerar Ideias */}
        {abaSelecionada === 'gerar' && (
          <div>
            {/* Seleção de Tipo */}
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>
                Escolha o tipo de ideia criativa:
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}>
                {tiposDisponiveis.map((tipo) => (
                  <button
                    key={tipo.value}
                    onClick={() => setTipoSelecionado(tipo.value)}
                    style={{
                      backgroundColor: tipoSelecionado === tipo.value ? '#e0f2fe' : '#f5f5f5',
                      border: tipoSelecionado === tipo.value ? '2px solid #0284c7' : '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }}>
                      {tipo.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        {tipo.label}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {tipo.descricao}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={gerarSugestoes}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Gerando ideias...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Gerar Sugestões
                  </>
                )}
              </button>
            </div>

            {/* Resultado */}
            {sugestoesBuscadas.length > 0 && (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                {sugestoesBuscadas.map((sugestao) => (
                  <div key={sugestao.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {obterLabelTipo(sugestao.tipo)}
                      </h3>
                      <button
                        onClick={() => copiarParaPapeleta(sugestao.resposta_ia)}
                        style={{
                          backgroundColor: '#f0f0f0',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <Copy size={16} />
                        Copiar
                      </button>
                    </div>

                    <div style={{
                      backgroundColor: '#f9f9f9',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      padding: '16px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6',
                      fontSize: '13px',
                      color: '#333',
                      maxHeight: '500px',
                      overflowY: 'auto',
                    }}>
                      {sugestao.resposta_ia}
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                      Gerado em {new Date(sugestao.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba: Histórico */}
        {abaSelecionada === 'historico' && (
          <div>
            {loadingHistorico ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <p>Carregando histórico...</p>
              </div>
            ) : historico.length === 0 ? (
              <div style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                color: '#666',
              }}>
                <p>Nenhuma sugestão gerada ainda. Comece a gerar ideias criativas!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historico.map((sugestao) => (
                  <div
                    key={sugestao.id}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      padding: '16px',
                      border: '1px solid #e0e0e0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {obterLabelTipo(sugestao.tipo)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {sugestao.resposta_ia.substring(0, 100)}...
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                        {new Date(sugestao.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => copiarParaPapeleta(sugestao.resposta_ia)}
                        style={{
                          backgroundColor: '#f0f0f0',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#666',
                        }}
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => deletarSugestao(sugestao.id)}
                        style={{
                          backgroundColor: '#fee',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#c33',
                        }}
                        title="Deletar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
