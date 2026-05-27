import { db } from '../../db/client.js';

export interface ResumoFinanceiro {
  periodo: string;
  receita: {
    total: number;
    clientes: number;
    esporadicas: number;
  };
  despesa: {
    total: number;
    pendente: number;
    pago: number;
    atrasado: number;
  };
  saldo: number;
  contasAtrasadas: number;
  proximasContas: Array<{
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    fornecedor_nome: string;
    dias_faltam: number;
  }>;
}

export async function obterResumoFinanceiro(adminId: string): Promise<ResumoFinanceiro> {
  const hoje = new Date().toISOString().split('T')[0];

  // Total de receitas de clientes (faturas pagas)
  const receitasClientes = await db<Array<{ total: string }>>`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM faturas
    WHERE status = 'paga'
  `;

  // Total de receitas esporádicas recebidas
  const receitasEsporadicas = await db<Array<{ total: string }>>`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM receitas_esporadicas
    WHERE admin_id = ${adminId}
    AND status = 'recebido'
  `;

  // Total de despesas (contas a pagar)
  const despesaTotal = await db<Array<{ total: string }>>`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM contas_pagar
    WHERE admin_id = ${adminId}
    AND status != 'cancelado'
  `;

  // Despesas por status
  const despesaPorStatus = await db<Array<{ status: string; total: string }>>`
    SELECT status, COALESCE(SUM(valor), 0) as total
    FROM contas_pagar
    WHERE admin_id = ${adminId}
    AND status != 'cancelado'
    GROUP BY status
  `;

  // Contas atrasadas
  const contasAtrasadas = await db<Array<{ count: string }>>`
    SELECT COUNT(*) as count
    FROM contas_pagar
    WHERE admin_id = ${adminId}
    AND status = 'pendente'
    AND data_vencimento < ${hoje}
  `;

  // Próximas contas a vencer
  const proximasContas = await db<
    Array<{
      id: string;
      descricao: string;
      valor: string;
      data_vencimento: string;
      fornecedor_nome: string;
    }>
  >`
    SELECT
      cp.id,
      cp.descricao,
      cp.valor,
      cp.data_vencimento,
      f.nome as fornecedor_nome
    FROM contas_pagar cp
    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
    WHERE cp.admin_id = ${adminId}
    AND cp.status = 'pendente'
    AND cp.data_vencimento >= ${hoje}
    ORDER BY cp.data_vencimento ASC
    LIMIT 5
  `;

  const totalReceita = parseFloat(receitasClientes[0]?.total || '0') + parseFloat(receitasEsporadicas[0]?.total || '0');
  const totalDespesa = parseFloat(despesaTotal[0]?.total || '0');

  const despesaPorStatusMap: Record<string, number> = {};
  despesaPorStatus.forEach((item) => {
    despesaPorStatusMap[item.status] = parseFloat(item.total);
  });

  const proximasContasFormatadas = proximasContas.map((conta) => ({
    id: conta.id,
    descricao: conta.descricao,
    valor: parseFloat(conta.valor),
    data_vencimento: conta.data_vencimento,
    fornecedor_nome: conta.fornecedor_nome || 'Sem fornecedor',
    dias_faltam: Math.ceil((new Date(conta.data_vencimento).getTime() - new Date(hoje).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return {
    periodo: 'Atual',
    receita: {
      total: totalReceita,
      clientes: parseFloat(receitasClientes[0]?.total || '0'),
      esporadicas: parseFloat(receitasEsporadicas[0]?.total || '0'),
    },
    despesa: {
      total: totalDespesa,
      pendente: despesaPorStatusMap['pendente'] || 0,
      pago: despesaPorStatusMap['pago'] || 0,
      atrasado: despesaPorStatusMap['atrasado'] || 0,
    },
    saldo: totalReceita - totalDespesa,
    contasAtrasadas: parseInt(contasAtrasadas[0]?.count || '0'),
    proximasContas: proximasContasFormatadas,
  };
}
