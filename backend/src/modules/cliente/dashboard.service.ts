import { db } from '../../db/client.js';
import { gerarRelatorio } from '../../services/meta-ads.js';

type DatePreset = 'last_7d' | 'last_30d' | 'last_90d';

export interface ResumoCliente {
  totalSpend: number;
  totalCliques: number;
  totalConversasIniciadasMensagem: number;
  totalCampanhas: number;
  periodo: string;
}

export interface CampanhaCliente {
  id: string;
  nome: string;
  status: string;
  spend: number;
  cliques: number;
  conversasIniciadasMensagem: number;
  taxa_conversao: number;
  ctr: number;
  data_inicio?: string;
  data_fim?: string;
}

export interface DashboardCliente {
  resumo: ResumoCliente;
  campanhas: CampanhaCliente[];
  periodo: string;
}

/**
 * Fetch campaign dashboard data for a specific client (cliente_id)
 * Data comes from Meta Ads snapshots filtered by cliente_id
 */
export async function obterDashboardCliente(
  clienteId: string,
  periodo: DatePreset = 'last_7d'
): Promise<DashboardCliente> {
  // Validate cliente exists and user has access to it
  const cliente = await db`
    SELECT id, nome, meta_ads_account_id FROM clientes WHERE id = ${clienteId}
  `;

  if (cliente.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const clienteData = cliente[0];

  if (!clienteData.meta_ads_account_id) {
    throw new Error('Cliente não possui Meta Ads account configurado');
  }

  // Use existing gerarRelatorio service to fetch actual data
  try {
    const relatorio = await gerarRelatorio(clienteData.meta_ads_account_id, periodo);

    // Extract campaign data
    const campanhas: CampanhaCliente[] = (relatorio.campanhas || []).map((camp: any) => ({
      id: camp.id,
      nome: camp.nome,
      status: camp.status,
      spend: camp.spend || 0,
      cliques: camp.cliques || 0,
      conversasIniciadasMensagem: camp.conversasIniciadasMensagem || 0,
      taxa_conversao: camp.taxa_conversao || 0,
      ctr: camp.ctr || 0,
      data_inicio: camp.data_inicio,
      data_fim: camp.data_fim,
    }));

    // Build resumo
    const resumo: ResumoCliente = {
      totalSpend: relatorio.resumo?.totalSpend || 0,
      totalCliques: relatorio.resumo?.totalCliques || 0,
      totalConversasIniciadasMensagem: relatorio.resumo?.totalConversasIniciadasMensagem || 0,
      totalCampanhas: campanhas.length,
      periodo,
    };

    return {
      resumo,
      campanhas,
      periodo,
    };
  } catch (error) {
    throw new Error(`Erro ao buscar dados do dashboard: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Get comparison data between two periods
 */
export async function obterComparativoCliente(
  clienteId: string,
  periodo1: DatePreset = 'last_7d',
  periodo2: DatePreset = 'last_7d'
): Promise<any> {
  const cliente = await db`
    SELECT id, meta_ads_account_id FROM clientes WHERE id = ${clienteId}
  `;

  if (cliente.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const metaAdsAccountId = cliente[0].meta_ads_account_id;

  if (!metaAdsAccountId) {
    throw new Error('Cliente não possui Meta Ads account configurado');
  }

  const [relatorio1, relatorio2] = await Promise.all([
    gerarRelatorio(metaAdsAccountId, periodo1),
    gerarRelatorio(metaAdsAccountId, periodo2),
  ]);

  return {
    periodo1: {
      periodo: periodo1,
      spend: relatorio1.resumo?.totalSpend || 0,
      cliques: relatorio1.resumo?.totalCliques || 0,
      conversas: relatorio1.resumo?.totalConversasIniciadasMensagem || 0,
    },
    periodo2: {
      periodo: periodo2,
      spend: relatorio2.resumo?.totalSpend || 0,
      cliques: relatorio2.resumo?.totalCliques || 0,
      conversas: relatorio2.resumo?.totalConversasIniciadasMensagem || 0,
    },
    variacao: {
      spend: {
        valor: (relatorio1.resumo?.totalSpend || 0) - (relatorio2.resumo?.totalSpend || 0),
        percentual: relatorio2.resumo?.totalSpend
          ? (((relatorio1.resumo?.totalSpend || 0) - (relatorio2.resumo?.totalSpend || 0)) / (relatorio2.resumo?.totalSpend || 0)) * 100
          : 0,
      },
      cliques: {
        valor: (relatorio1.resumo?.totalCliques || 0) - (relatorio2.resumo?.totalCliques || 0),
        percentual: relatorio2.resumo?.totalCliques
          ? (((relatorio1.resumo?.totalCliques || 0) - (relatorio2.resumo?.totalCliques || 0)) / (relatorio2.resumo?.totalCliques || 0)) * 100
          : 0,
      },
      conversas: {
        valor: (relatorio1.resumo?.totalConversasIniciadasMensagem || 0) - (relatorio2.resumo?.totalConversasIniciadasMensagem || 0),
        percentual: relatorio2.resumo?.totalConversasIniciadasMensagem
          ? (((relatorio1.resumo?.totalConversasIniciadasMensagem || 0) - (relatorio2.resumo?.totalConversasIniciadasMensagem || 0)) / (relatorio2.resumo?.totalConversasIniciadasMensagem || 0)) * 100
          : 0,
      },
    },
  };
}

/**
 * Get trends data for a specific metric over time
 */
export async function obterTendenciasCliente(
  clienteId: string,
  metrica: 'spend' | 'cliques' | 'conversas' = 'spend',
  periodo: DatePreset = 'last_30d'
): Promise<any> {
  const cliente = await db`
    SELECT id, meta_ads_account_id FROM clientes WHERE id = ${clienteId}
  `;

  if (cliente.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const metaAdsAccountId = cliente[0].meta_ads_account_id;

  if (!metaAdsAccountId) {
    throw new Error('Cliente não possui Meta Ads account configurado');
  }

  // Fetch snapshots for the period
  const snapshots = await db`
    SELECT
      DATE(data_snapshot) as data,
      SUM(CAST(spend AS DECIMAL)) as total_spend,
      SUM(CAST(cliques AS DECIMAL)) as total_cliques,
      SUM(CAST(conversas_iniciadas_mensagem AS DECIMAL)) as total_conversas
    FROM insights_snapshots
    WHERE meta_ads_account_id = ${metaAdsAccountId}
    AND data_snapshot >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(data_snapshot)
    ORDER BY data ASC
  `;

  const metricaMap = {
    spend: 'total_spend',
    cliques: 'total_cliques',
    conversas: 'total_conversas',
  };

  const dados = snapshots.map((snap: any) => ({
    data: snap.data,
    valor: snap[metricaMap[metrica]] || 0,
  }));

  return {
    metrica,
    periodo,
    dados,
  };
}
