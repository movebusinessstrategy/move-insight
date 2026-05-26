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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [filterMetaAds, setFilterMetaAds] = useState<'todos' | 'com' | 'sem'>('todos');
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>('tabela');
  const [sortBy, setSortBy] = useState<'nome' | 'valor' | 'vencimento'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Filtrar e ordenar clientes
  const clientesFiltrados = clientes
    .filter((cliente) => {
      const matchSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || cliente.status === filterStatus;
      const matchMetaAds = filterMetaAds === 'todos' ||
        (filterMetaAds === 'com' && cliente.meta_ads_account_id) ||
        (filterMetaAds === 'sem' && !cliente.meta_ads_account_id);
      return matchSearch && matchStatus && matchMetaAds;
    })
    .sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'nome') {
        aVal = a.nome.toLowerCase();
        bVal = b.nome.toLowerCase();
      } else if (sortBy === 'valor') {
        aVal = a.valor_mensal ? Number(a.valor_mensal) : 0;
        bVal = b.valor_mensal ? Number(b.valor_mensal) : 0;
      } else {
        aVal = a.dia_vencimento || 0;
        bVal = b.dia_vencimento || 0;
      }
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

  // Calcular métricas
  const metricas = {
    totalClientes: clientes.length,
    clientesAtivos: clientes.filter((c) => c.status === 'ativo').length,
    faturamentoTotal: clientes.reduce((sum, c) => sum + (c.valor_mensal ? Number(c.valor_mensal) : 0), 0),
    comMetaAds: clientes.filter((c) => c.meta_ads_account_id).length,
  };

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
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>📋 Clientes</h2>
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

          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #1a73e8', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  👥 Total de Clientes
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1a73e8' }}>{metricas.totalClientes}</p>
              </div>
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #28a745', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  ✅ Clientes Ativos
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>{metricas.clientesAtivos}</p>
              </div>
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #ff9800', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  💰 Faturamento Mensal
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                  R$ {metricas.faturamentoTotal.toFixed(2)}
                </p>
              </div>
              <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #6f42c1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  📊 Com Meta Ads
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#6f42c1' }}>{metricas.comMetaAds}</p>
              </div>
            </div>
          )}

          {!loading && clientes.length > 0 && (
            <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '6px' }}>
                    🔍 Buscar
                  </label>
                  <input
                    type="text"
                    placeholder="Nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="ativo">Ativos</option>
                    <option value="inativo">Inativos</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '6px' }}>
                    Meta Ads
                  </label>
                  <select
                    value={filterMetaAds}
                    onChange={(e) => setFilterMetaAds(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="com">Com Meta Ads</option>
                    <option value="sem">Sem Meta Ads</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setViewMode('tabela')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: viewMode === 'tabela' ? '#1a73e8' : '#f0f0f0',
                      color: viewMode === 'tabela' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: viewMode === 'tabela' ? 'bold' : 'normal',
                    }}
                  >
                    📊 Tabela
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: viewMode === 'cards' ? '#1a73e8' : '#f0f0f0',
                      color: viewMode === 'cards' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: viewMode === 'cards' ? 'bold' : 'normal',
                    }}
                  >
                    🗂️ Cards
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Ordenar:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="nome">Nome</option>
                    <option value="valor">Valor Mensal</option>
                    <option value="vencimento">Vencimento</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                  </button>
                </div>
              </div>

              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#666' }}>
                Mostrando {clientesFiltrados.length} de {clientes.length} clientes
              </p>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Carregando clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
              {clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente corresponde aos filtros'}
            </div>
          ) : viewMode === 'tabela' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Cliente</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Valor Mensal</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Vencimento</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Meta Ads</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente, idx) => (
                    <tr key={cliente.id} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white' }}>
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
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {cliente.meta_ads_account_id ? <span style={{ fontSize: '16px' }}>✅</span> : <span style={{ fontSize: '16px', opacity: 0.3 }}>❌</span>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => abrirEdicao(cliente)} title="Editar cliente" style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                        <button onClick={() => handleVisualizarRelatorio(cliente)} disabled={loadingRelatorio === cliente.id || !cliente.meta_ads_account_id} title={cliente.meta_ads_account_id ? 'Ver relatório' : 'Configure Meta Ads'} style={{ padding: '6px 12px', backgroundColor: cliente.meta_ads_account_id ? '#28a745' : '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: cliente.meta_ads_account_id ? 'pointer' : 'not-allowed', fontSize: '12px', opacity: loadingRelatorio === cliente.id ? 0.6 : 1 }}>{loadingRelatorio === cliente.id ? '...' : '📊'}</button>
                        <button onClick={() => navigate(`/dashboard/cliente/${cliente.id}`)} title="Dashboard do cliente" style={{ padding: '6px 12px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📈</button>
                        <button onClick={() => handleLembrarPagamento(cliente.id)} disabled={reminderLoading === cliente.id || !cliente.billing_reminder_active} title={cliente.billing_reminder_active ? 'Enviar lembrete' : 'Desabilitado'} style={{ padding: '6px 12px', backgroundColor: cliente.billing_reminder_active ? '#1a73e8' : '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: cliente.billing_reminder_active ? 'pointer' : 'not-allowed', fontSize: '12px', opacity: reminderLoading === cliente.id ? 0.6 : 1 }}>{reminderLoading === cliente.id ? '...' : '💬'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  style={{
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <h3 style={{ margin: '0 0 6px 0', color: '#333', fontSize: '16px' }}>{cliente.nome}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '12px', marginBottom: '16px' }}>{cliente.email}</p>
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Valor:</span>
                      <strong style={{ color: '#ff9800' }}>{cliente.valor_mensal ? `R$ ${Number(cliente.valor_mensal).toFixed(2)}` : '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Vencimento:</span>
                      <strong style={{ color: '#666' }}>{cliente.dia_vencimento ? `Dia ${cliente.dia_vencimento}` : '—'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Status:</span>
                      <span style={{ padding: '4px 8px', backgroundColor: cliente.status === 'ativo' ? '#efe' : '#fee', color: cliente.status === 'ativo' ? '#3c3' : '#c33', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{cliente.status}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Meta Ads:</span>
                    <span style={{ fontSize: '18px' }}>{cliente.meta_ads_account_id ? '✅' : '❌'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={() => abrirEdicao(cliente)} style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>✏️ Editar</button>
                    <button onClick={() => navigate(`/dashboard/cliente/${cliente.id}`)} style={{ padding: '8px 12px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📈 Dashboard</button>
                    <button onClick={() => handleVisualizarRelatorio(cliente)} disabled={loadingRelatorio === cliente.id || !cliente.meta_ads_account_id} style={{ padding: '8px 12px', backgroundColor: cliente.meta_ads_account_id ? '#28a745' : '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: cliente.meta_ads_account_id ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 'bold', opacity: loadingRelatorio === cliente.id ? 0.6 : 1 }}>{loadingRelatorio === cliente.id ? '...' : '📊 Relatório'}</button>
                    <button onClick={() => handleLembrarPagamento(cliente.id)} disabled={reminderLoading === cliente.id || !cliente.billing_reminder_active} style={{ padding: '8px 12px', backgroundColor: cliente.billing_reminder_active ? '#1a73e8' : '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: cliente.billing_reminder_active ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 'bold', opacity: reminderLoading === cliente.id ? 0.6 : 1 }}>{reminderLoading === cliente.id ? '...' : '💬'}</button>
                  </div>
                </div>
              ))}
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
