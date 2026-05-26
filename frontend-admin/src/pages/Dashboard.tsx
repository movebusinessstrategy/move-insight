import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminderLoading, setReminderLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('clientes');
  const [whatsappStatus, setWhatsappStatus] = useState<'desconectado' | 'conectando' | 'conectado'>('desconectado');
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [viewingRelatorio, setViewingRelatorio] = useState<{ cliente: Cliente; relatorio: Relatorio } | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState<string | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    nome: '',
    email: '',
    valor_mensal: '',
    dia_vencimento: '',
    tipo_pessoa: 'pf' as 'pf' | 'pj',
    cpf_cnpj: '',
    nome_fantasia: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    whatsapp_numero: '',
    meta_ads_account_id: '',
    data_inicio_trabalhos: '',
  });
  const [creatingLoading, setCreatingLoading] = useState(false);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const response = await fetch('/api/admin/clientes', {
          credentials: 'include',
        });
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login', { replace: true });
    } catch (_error) {
      console.error('Erro ao fazer logout');
    }
  };

  const handleLembrarPagamento = async (clienteId: string) => {
    setReminderLoading(clienteId);
    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}/lembrar-pagamento`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        alert('Lembrete de pagamento disparado com sucesso!');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (_error) {
      alert('Erro ao enviar lembrete');
    } finally {
      setReminderLoading(null);
    }
  };

  const formatWhatsAppNumber = (numero: string): string => {
    if (!numero) return '';
    // Remove tudo que não é número
    const apenasNumeros = numero.replace(/\D/g, '');
    // Se não começar com 55, adiciona o código do Brasil
    if (!apenasNumeros.startsWith('55')) {
      return `55${apenasNumeros}`;
    }
    return apenasNumeros;
  };

  const buscarEnderecoPorCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        alert('CEP não encontrado');
        return;
      }

      setNewClientForm((prev) => ({
        ...prev,
        endereco: data.logradouro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }));
    } catch (_error) {
      alert('Erro ao buscar CEP');
    }
  };

  const handleConectarWhatsApp = () => {
    alert(
      '📱 Para conectar WhatsApp:\n\n' +
      '1. Verifique os logs do servidor (terminal onde npm run dev está rodando)\n' +
      '2. Procure pela mensagem "📱 QR Code gerado"\n' +
      '3. Escaneie o código QR com seu WhatsApp\n' +
      '4. Após escanear, a mensagem "🚀 WhatsApp pronto para enviar mensagens" aparecerá\n\n' +
      'Depois disso, você conseguirá disparar relatórios e lembretes via WhatsApp!'
    );
  };

  const abrirEdicao = (cliente: any) => {
    setEditingCliente(cliente);
    setNewClientForm({
      nome: cliente.nome || '',
      email: cliente.email || '',
      valor_mensal: cliente.valor_mensal ? String(cliente.valor_mensal) : '',
      dia_vencimento: cliente.dia_vencimento ? String(cliente.dia_vencimento) : '',
      tipo_pessoa: cliente.tipo_pessoa || 'pf',
      cpf_cnpj: cliente.cpf_cnpj || '',
      nome_fantasia: cliente.nome_fantasia || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      telefone: cliente.telefone || '',
      whatsapp_numero: cliente.whatsapp_numero || '',
      meta_ads_account_id: cliente.meta_ads_account_id || '',
      data_inicio_trabalhos: cliente.data_inicio_trabalhos || '',
    });
    setIsEditingMode(true);
  };

  const fecharEdicao = () => {
    setEditingCliente(null);
    setIsEditingMode(false);
    setNewClientForm({
      nome: '',
      email: '',
      valor_mensal: '',
      dia_vencimento: '',
      tipo_pessoa: 'pf',
      cpf_cnpj: '',
      nome_fantasia: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      whatsapp_numero: '',
      meta_ads_account_id: '',
      data_inicio_trabalhos: '',
    });
  };

  const handleVisualizarRelatorio = async (cliente: Cliente) => {
    if (!cliente.meta_ads_account_id || cliente.meta_ads_account_id === '') {
      alert('Cliente não possui ID de conta Meta Ads configurado');
      return;
    }

    setLoadingRelatorio(cliente.id);
    try {
      const response = await fetch(`/api/admin/clientes/${cliente.id}/relatorio`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setViewingRelatorio({ cliente, relatorio: data.relatorio });
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (_error) {
      alert('Erro ao carregar relatório');
    } finally {
      setLoadingRelatorio(null);
    }
  };

  const fecharRelatorio = () => {
    setViewingRelatorio(null);
  };

  const handleCriarCliente = async () => {
    if (!newClientForm.nome || !newClientForm.email) {
      alert('Nome e email são obrigatórios');
      return;
    }

    setCreatingLoading(true);
    try {
      const response = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nome: newClientForm.nome,
          email: newClientForm.email,
          valor_mensal: newClientForm.valor_mensal ? Number(newClientForm.valor_mensal) : null,
          dia_vencimento: newClientForm.dia_vencimento ? Number(newClientForm.dia_vencimento) : null,
          tipo_pessoa: newClientForm.tipo_pessoa,
          cpf_cnpj: newClientForm.cpf_cnpj || null,
          nome_fantasia: newClientForm.nome_fantasia || null,
          endereco: newClientForm.endereco || null,
          cidade: newClientForm.cidade || null,
          estado: newClientForm.estado || null,
          cep: newClientForm.cep || null,
          telefone: newClientForm.telefone || null,
          whatsapp_numero: newClientForm.whatsapp_numero ? formatWhatsAppNumber(newClientForm.whatsapp_numero) : null,
          meta_ads_account_id: newClientForm.meta_ads_account_id || null,
          data_inicio_trabalhos: newClientForm.data_inicio_trabalhos || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setClientes((prev) => [...prev, data.cliente]);
        setNewClientForm({
          nome: '',
          email: '',
          valor_mensal: '',
          dia_vencimento: '',
          tipo_pessoa: 'pf',
          cpf_cnpj: '',
          nome_fantasia: '',
          endereco: '',
          cidade: '',
          estado: '',
          cep: '',
          telefone: '',
          whatsapp_numero: '',
          meta_ads_account_id: '',
          data_inicio_trabalhos: '',
        });
        setCreatingClient(false);
        alert('Cliente criado com sucesso!');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (_error) {
      alert('Erro ao criar cliente');
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleSalvarConfig = async () => {
    if (!editingCliente) return;

    setSavingConfig(true);
    try {
      const response = await fetch(`/api/admin/clientes/${editingCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tipo_pessoa: newClientForm.tipo_pessoa,
          nome: newClientForm.nome,
          email: newClientForm.email,
          cpf_cnpj: newClientForm.cpf_cnpj || null,
          nome_fantasia: newClientForm.nome_fantasia || null,
          telefone: newClientForm.telefone || null,
          whatsapp_numero: newClientForm.whatsapp_numero ? formatWhatsAppNumber(newClientForm.whatsapp_numero) : null,
          endereco: newClientForm.endereco || null,
          cidade: newClientForm.cidade || null,
          estado: newClientForm.estado || null,
          cep: newClientForm.cep || null,
          data_inicio_trabalhos: newClientForm.data_inicio_trabalhos || null,
          valor_mensal: newClientForm.valor_mensal ? Number(newClientForm.valor_mensal) : null,
          dia_vencimento: newClientForm.dia_vencimento ? Number(newClientForm.dia_vencimento) : null,
          meta_ads_account_id: newClientForm.meta_ads_account_id || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setClientes((prev) =>
          prev.map((c) => (c.id === editingCliente.id ? data.cliente : c))
        );
        fecharEdicao();
        alert('Cliente atualizado com sucesso!');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (_error) {
      alert('Erro ao atualizar cliente');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>Dashboard - Gestão MOVE Insights</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Bem-vindo, {user.nome}!</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Logout
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('clientes')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'clientes' ? '#1a73e8' : 'transparent',
            color: activeTab === 'clientes' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'clientes' ? 'bold' : 'normal',
            borderBottom: activeTab === 'clientes' ? 'none' : '',
          }}
        >
          👥 Clientes
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'whatsapp' ? '#1a73e8' : 'transparent',
            color: activeTab === 'whatsapp' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'whatsapp' ? 'bold' : 'normal',
          }}
        >
          💬 WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('meta-ads')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'meta-ads' ? '#1a73e8' : 'transparent',
            color: activeTab === 'meta-ads' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'meta-ads' ? 'bold' : 'normal',
          }}
        >
          📊 Meta Ads
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee', borderRadius: '4px', color: '#c33', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* ABA: CLIENTES */}
      {activeTab === 'clientes' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setCreatingClient(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              + Novo Cliente
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando clientes...</div>
          ) : clientes.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
              Nenhum cliente cadastrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Valor Mensal</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Vencimento</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <strong>{cliente.nome}</strong>
                      </td>
                      <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>{cliente.email}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {cliente.valor_mensal ? `R$ ${Number(cliente.valor_mensal).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {cliente.dia_vencimento ? `Dia ${cliente.dia_vencimento}` : '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            backgroundColor: cliente.status === 'ativo' ? '#efe' : '#fee',
                            color: cliente.status === 'ativo' ? '#3c3' : '#c33',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {cliente.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => abrirEdicao(cliente)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleVisualizarRelatorio(cliente)}
                          disabled={loadingRelatorio === cliente.id || !cliente.meta_ads_account_id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: cliente.meta_ads_account_id ? '#28a745' : '#999',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: cliente.meta_ads_account_id ? 'pointer' : 'not-allowed',
                            fontSize: '12px',
                            opacity: loadingRelatorio === cliente.id ? 0.6 : 1,
                          }}
                        >
                          {loadingRelatorio === cliente.id ? '...' : '📊 Relatório'}
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/cliente/${cliente.id}`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6f42c1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          📈 Dashboard
                        </button>
                        <button
                          onClick={() => handleLembrarPagamento(cliente.id)}
                          disabled={reminderLoading === cliente.id || !cliente.billing_reminder_active}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: cliente.billing_reminder_active ? '#1a73e8' : '#999',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: cliente.billing_reminder_active ? 'pointer' : 'not-allowed',
                            fontSize: '12px',
                            opacity: reminderLoading === cliente.id ? 0.6 : 1,
                          }}
                        >
                          {reminderLoading === cliente.id ? '...' : '💬 Lembrar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: WHATSAPP */}
      {activeTab === 'whatsapp' && (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h2>Conectar WhatsApp</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Conecte sua conta WhatsApp para disparar lembretes de pagamento automaticamente.
          </p>

          <div style={{ marginTop: '30px', padding: '30px', backgroundColor: 'white', borderRadius: '4px', textAlign: 'center', border: '2px dashed #ddd' }}>
            {whatsappStatus === 'desconectado' && (
              <div>
                <p style={{ fontSize: '48px', marginBottom: '10px' }}>📱</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>WhatsApp desconectado</p>
                <p style={{ color: '#666', marginTop: '8px', marginBottom: '20px' }}>
                  Clique no botão abaixo e escaneie o QR code com seu WhatsApp
                </p>
                <button
                  onClick={handleConectarWhatsApp}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#25d366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  🔗 Conectar WhatsApp
                </button>
              </div>
            )}

            {whatsappStatus === 'conectando' && (
              <div>
                <p style={{ fontSize: '48px', marginBottom: '10px', animation: 'spin 2s linear infinite' }}>⏳</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Aguardando conexão...</p>
                <p style={{ color: '#666', marginTop: '8px' }}>Escaneie o QR code com seu WhatsApp</p>
              </div>
            )}

            {whatsappStatus === 'conectado' && (
              <div>
                <p style={{ fontSize: '48px', marginBottom: '10px' }}>✅</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#3c3' }}>WhatsApp conectado!</p>
                <p style={{ color: '#666', marginTop: '8px', marginBottom: '20px' }}>
                  Você pode agora disparar lembretes de pagamento
                </p>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  Desconectar
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '4px', color: '#0066cc' }}>
            <p>
              <strong>ℹ️ Como funciona:</strong> Ao conectar, você receberá os lembretes no seu WhatsApp pessoal antes de serem enviados aos
              clientes. Todos os lembretes ficam registrados no histórico.
            </p>
          </div>
        </div>
      )}

      {/* ABA: META ADS */}
      {activeTab === 'meta-ads' && (
        <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h2>Integração Meta Ads</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Conecte suas contas Meta Ads para importar dados de campanhas e anúncios.
          </p>

          <div style={{ marginTop: '30px', padding: '30px', backgroundColor: 'white', borderRadius: '4px', textAlign: 'center', border: '2px dashed #ddd' }}>
            <p style={{ fontSize: '48px', marginBottom: '10px' }}>📊</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Meta Ads - Em desenvolvimento</p>
            <p style={{ color: '#666', marginTop: '8px', marginBottom: '20px' }}>
              A integração com Meta Ads API será disponibilizada em breve
            </p>
            <button
              disabled
              style={{
                padding: '12px 24px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'not-allowed',
                fontSize: '16px',
                opacity: 0.6,
              }}
            >
              Conectar Meta Ads
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0f7ff', borderRadius: '4px', color: '#0066cc' }}>
            <p>
              <strong>🎯 Próximos passos:</strong> A integração com Meta Ads API permitirá visualizar ROI, CPC, conversões e outros dados em tempo
              real dos seus clientes.
            </p>
          </div>
        </div>
      )}

      {(creatingClient || isEditingMode) && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', margin: '20px 0' }}>
            <h2 style={{ marginTop: 0 }}>{isEditingMode ? `Editar Cliente: ${editingCliente?.nome}` : 'Cadastrar Novo Cliente'}</h2>

            {/* TIPO DE PESSOA */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                Tipo de Pessoa
              </label>
              <select
                value={newClientForm.tipo_pessoa}
                onChange={(e) => setNewClientForm({ ...newClientForm, tipo_pessoa: e.target.value as 'pf' | 'pj' })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="pf">Pessoa Física</option>
                <option value="pj">Pessoa Jurídica</option>
              </select>
            </div>

            {/* NOME E EMAIL */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  value={newClientForm.nome}
                  onChange={(e) => setNewClientForm({ ...newClientForm, nome: e.target.value })}
                  placeholder="Nome completo"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* CPF/CNPJ E NOME FANTASIA */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  {newClientForm.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}
                </label>
                <input
                  type="text"
                  value={newClientForm.cpf_cnpj}
                  onChange={(e) => setNewClientForm({ ...newClientForm, cpf_cnpj: e.target.value })}
                  placeholder={newClientForm.tipo_pessoa === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  {newClientForm.tipo_pessoa === 'pf' ? 'Nome Social' : 'Nome Fantasia'}
                </label>
                <input
                  type="text"
                  value={newClientForm.nome_fantasia}
                  onChange={(e) => setNewClientForm({ ...newClientForm, nome_fantasia: e.target.value })}
                  placeholder="Como o cliente é conhecido"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* TELEFONE & WHATSAPP */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Telefone
                </label>
                <input
                  type="tel"
                  value={newClientForm.telefone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={newClientForm.whatsapp_numero}
                  onChange={(e) => setNewClientForm({ ...newClientForm, whatsapp_numero: e.target.value })}
                  placeholder="43 99625-5556"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* CEP */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                📮 CEP
              </label>
              <input
                type="text"
                value={newClientForm.cep}
                onChange={(e) => setNewClientForm({ ...newClientForm, cep: e.target.value })}
                onBlur={(e) => buscarEnderecoPorCEP(e.target.value)}
                placeholder="86000-000"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                Digite o CEP e o endereço será preenchido automaticamente
              </p>
            </div>

            {/* ENDEREÇO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                Endereço
              </label>
              <input
                type="text"
                value={newClientForm.endereco}
                onChange={(e) => setNewClientForm({ ...newClientForm, endereco: e.target.value })}
                placeholder="Rua, número, complemento"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* CIDADE E ESTADO */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Cidade
                </label>
                <input
                  type="text"
                  value={newClientForm.cidade}
                  onChange={(e) => setNewClientForm({ ...newClientForm, cidade: e.target.value })}
                  placeholder="Cambé"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Estado
                </label>
                <input
                  type="text"
                  value={newClientForm.estado}
                  onChange={(e) => setNewClientForm({ ...newClientForm, estado: e.target.value })}
                  placeholder="PR"
                  maxLength={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* META ADS */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                ID da Conta Meta Ads
              </label>
              <input
                type="text"
                value={newClientForm.meta_ads_account_id}
                onChange={(e) => setNewClientForm({ ...newClientForm, meta_ads_account_id: e.target.value })}
                placeholder="627192099262266"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* DATA INÍCIO */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                Data de Início dos Trabalhos
              </label>
              <input
                type="date"
                value={newClientForm.data_inicio_trabalhos}
                onChange={(e) => setNewClientForm({ ...newClientForm, data_inicio_trabalhos: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* FINANCEIRO */}
            <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Valor Mensal
                </label>
                <input
                  type="number"
                  value={newClientForm.valor_mensal}
                  onChange={(e) => setNewClientForm({ ...newClientForm, valor_mensal: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  Dia Vencimento (para alertas)
                </label>
                <input
                  type="number"
                  value={newClientForm.dia_vencimento}
                  onChange={(e) => setNewClientForm({ ...newClientForm, dia_vencimento: e.target.value })}
                  placeholder="10"
                  min="1"
                  max="31"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={isEditingMode ? fecharEdicao : () => {
                  setCreatingClient(false);
                  setNewClientForm({
                    nome: '',
                    email: '',
                    valor_mensal: '',
                    dia_vencimento: '',
                    tipo_pessoa: 'pf',
                    cpf_cnpj: '',
                    nome_fantasia: '',
                    endereco: '',
                    cidade: '',
                    estado: '',
                    cep: '',
                    telefone: '',
                    whatsapp_numero: '',
                    meta_ads_account_id: '',
                    data_inicio_trabalhos: '',
                  });
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                disabled={isEditingMode ? savingConfig : creatingLoading}
              >
                Cancelar
              </button>
              <button
                onClick={isEditingMode ? handleSalvarConfig : handleCriarCliente}
                disabled={isEditingMode ? savingConfig : creatingLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isEditingMode ? '#1a73e8' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isEditingMode ? savingConfig : creatingLoading) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (isEditingMode ? savingConfig : creatingLoading) ? 0.6 : 1,
                }}
              >
                {isEditingMode ? (savingConfig ? 'Salvando...' : 'Salvar') : (creatingLoading ? 'Criando...' : 'Criar Cliente')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRelatorio && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '700px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0 }}>Relatório - {viewingRelatorio.cliente.nome}</h2>
              <button
                onClick={fecharRelatorio}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f7ff', borderRadius: '4px', borderLeft: '4px solid #1a73e8' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#1a73e8' }}>Período: {viewingRelatorio.relatorio.periodo}</p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>📱 Campanhas</h3>
              {viewingRelatorio.relatorio.campanhas.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>Nenhuma campanha encontrada</p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {viewingRelatorio.relatorio.campanhas.map((campanha, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#333' }}>{campanha.nome}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#666' }}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>Impressões:</span> {campanha.impressoes.toLocaleString('pt-BR')}
                        </div>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>Cliques:</span> {campanha.cliques.toLocaleString('pt-BR')}
                        </div>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>CTR:</span> {campanha.ctr.toFixed(2)}%
                        </div>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>Conversões:</span> {campanha.conversoes.toLocaleString('pt-BR')}
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontWeight: 'bold' }}>Spend:</span> R$ {campanha.spend.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>💰 Resumo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>Total Spend</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
                    R$ {viewingRelatorio.relatorio.resumo.totalSpend.toFixed(2)}
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>Total Cliques</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
                    {viewingRelatorio.relatorio.resumo.totalCliques.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>Total Conversões</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    {viewingRelatorio.relatorio.resumo.totalConversoes.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#666' }}>ROAS</p>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    {viewingRelatorio.relatorio.resumo.roas.toFixed(2)}x
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={fecharRelatorio}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
