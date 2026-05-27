import { db } from '../../db/client.js';

export interface ContaPagar {
  id: string;
  admin_id: string;
  fornecedor_id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  categoria?: string;
  observacoes?: string;
  comprovante_url?: string;
  criada_em: string;
  atualizada_em: string;
}

export async function criarContaPagar(
  adminId: string,
  data: {
    fornecedor_id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    categoria?: string;
    observacoes?: string;
  }
): Promise<ContaPagar> {
  const resultado = await db<ContaPagar[]>`
    INSERT INTO contas_pagar (
      admin_id, fornecedor_id, descricao, valor, data_vencimento, categoria, observacoes
    ) VALUES (
      ${adminId}, ${data.fornecedor_id}, ${data.descricao}, ${data.valor},
      ${data.data_vencimento}, ${data.categoria || null}, ${data.observacoes || null}
    )
    RETURNING *
  `;
  return resultado[0];
}

export async function listarContasPagar(adminId: string, filters?: { status?: string; fornecedor_id?: string }): Promise<ContaPagar[]> {
  if (filters?.status && filters?.fornecedor_id) {
    return db<ContaPagar[]>`
      SELECT cp.*, f.nome as fornecedor_nome
      FROM contas_pagar cp
      LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
      WHERE cp.admin_id = ${adminId}
      AND cp.status = ${filters.status}
      AND cp.fornecedor_id = ${filters.fornecedor_id}
      ORDER BY cp.data_vencimento ASC
    `;
  }

  if (filters?.status) {
    return db<ContaPagar[]>`
      SELECT cp.*, f.nome as fornecedor_nome
      FROM contas_pagar cp
      LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
      WHERE cp.admin_id = ${adminId}
      AND cp.status = ${filters.status}
      ORDER BY cp.data_vencimento ASC
    `;
  }

  if (filters?.fornecedor_id) {
    return db<ContaPagar[]>`
      SELECT cp.*, f.nome as fornecedor_nome
      FROM contas_pagar cp
      LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
      WHERE cp.admin_id = ${adminId}
      AND cp.fornecedor_id = ${filters.fornecedor_id}
      ORDER BY cp.data_vencimento ASC
    `;
  }

  return db<ContaPagar[]>`
    SELECT cp.*, f.nome as fornecedor_nome
    FROM contas_pagar cp
    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
    WHERE cp.admin_id = ${adminId}
    ORDER BY cp.data_vencimento ASC
  `;
}

export async function obterContaPagarPorId(id: string, adminId: string): Promise<ContaPagar | null> {
  const resultado = await db<ContaPagar[]>`
    SELECT * FROM contas_pagar
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado[0] || null;
}

export async function listarContasAtrasadas(adminId: string): Promise<ContaPagar[]> {
  return db<ContaPagar[]>`
    SELECT cp.*, f.nome as fornecedor_nome
    FROM contas_pagar cp
    LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
    WHERE cp.admin_id = ${adminId}
    AND cp.status = 'pendente'
    AND cp.data_vencimento < CURRENT_DATE
    ORDER BY cp.data_vencimento ASC
  `;
}

export async function atualizarContaPagar(
  id: string,
  adminId: string,
  data: Partial<ContaPagar>
): Promise<ContaPagar | null> {
  const conta = await obterContaPagarPorId(id, adminId);
  if (!conta) return null;

  const fornecedor_id = data.fornecedor_id ?? conta.fornecedor_id;
  const descricao = data.descricao ?? conta.descricao;
  const valor = data.valor ?? conta.valor;
  const data_vencimento = data.data_vencimento ?? conta.data_vencimento;
  const data_pagamento = data.data_pagamento !== undefined ? data.data_pagamento : (conta.data_pagamento ?? null);
  const status = data.status ?? conta.status;
  const categoria = data.categoria !== undefined ? data.categoria : (conta.categoria ?? null);
  const observacoes = data.observacoes !== undefined ? data.observacoes : (conta.observacoes ?? null);

  const resultado = await db<ContaPagar[]>`
    UPDATE contas_pagar
    SET
      fornecedor_id = ${fornecedor_id},
      descricao = ${descricao},
      valor = ${valor},
      data_vencimento = ${data_vencimento},
      data_pagamento = ${data_pagamento},
      status = ${status},
      categoria = ${categoria},
      observacoes = ${observacoes},
      atualizada_em = NOW()
    WHERE id = ${id} AND admin_id = ${adminId}
    RETURNING *
  `;

  return resultado[0] || null;
}

export async function marcarComoPago(id: string, adminId: string): Promise<ContaPagar | null> {
  return atualizarContaPagar(id, adminId, {
    status: 'pago',
    data_pagamento: new Date().toISOString().split('T')[0],
  });
}

export async function deletarContaPagar(id: string, adminId: string): Promise<boolean> {
  const resultado = await db`
    DELETE FROM contas_pagar
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado.count > 0;
}
