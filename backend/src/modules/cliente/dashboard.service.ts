import { db } from '../../db/client.js';
import { gerarRelatorio } from '../../services/meta-ads.js';

export async function obterResumoCliente(clienteId: string, periodo: string = 'last_30d'): Promise<any> {
  const clienteResult = await db`
    SELECT id, nome, meta_ads_account_id
    FROM clientes
    WHERE id = ${clienteId}
  `;

  if (clienteResult.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const cliente = clienteResult[0];

  if (!cliente.meta_ads_account_id) {
    return {
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
      },
      periodo,
      resumo: {
        totalSpend: 0,
        totalCliques: 0,
        totalConversoes: 0,
        totalImpressoes: 0,
        totalConversasIniciadasMensagem: 0,
        cpmMedio: 0,
        cpcMedio: 0,
        roas: 0,
        comparacao_anterior: {
          variacao_spend: 0,
          variacao_cliques: 0,
        },
      },
      campanhas: [],
    };
  }

  const relatorio = await gerarRelatorio(cliente.meta_ads_account_id, periodo as any);

  return {
    cliente: {
      id: cliente.id,
      nome: cliente.nome,
    },
    periodo: relatorio.periodo,
    resumo: relatorio.resumo,
    campanhas: relatorio.campanhas,
  };
}

export async function obterCampanhasCliente(clienteId: string, periodo: string = 'last_30d'): Promise<any> {
  const clienteResult = await db`
    SELECT meta_ads_account_id FROM clientes WHERE id = ${clienteId}
  `;

  if (clienteResult.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const metaAccountId = clienteResult[0].meta_ads_account_id;

  if (!metaAccountId) {
    return [];
  }

  const relatorio = await gerarRelatorio(metaAccountId, periodo as any);
  return relatorio.campanhas;
}
