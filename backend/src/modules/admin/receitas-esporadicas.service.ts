import { db } from '../../db/client.js';

export interface ReceitaEsporadica {
  id: string;
  admin_id: string;
  cliente_id: string;
  descricao: string;
  valor: number;
  data_receita: string;
  tipo?: string;
  status: string;
  observacoes?: string;
  criada_em: string;
  atualizada_em: string;
}

export async function criarReceitaEsporadica(
  adminId: string,
  data: {
    cliente_id: string;
    descricao: string;
    valor: number;
    data_receita: string;
    tipo?: string;
    observacoes?: string;
  }
): Promise<ReceitaEsporadica> {
  const resultado = await db<ReceitaEsporadica[]>`
    INSERT INTO receitas_esporadicas (
      admin_id, cliente_id, descricao, valor, data_receita, tipo, observacoes
    ) VALUES (
      ${adminId}, ${data.cliente_id}, ${data.descricao}, ${data.valor},
      ${data.data_receita}, ${data.tipo || null}, ${data.observacoes || null}
    )
    RETURNING *
  `;
  return resultado[0];
}

export async function listarReceitasEsporadicas(adminId: string, filters?: { cliente_id?: string; status?: string }): Promise<ReceitaEsporadica[]> {
  const resultado = await db<ReceitaEsporadica[]>`
    SELECT re.*, c.nome as cliente_nome
    FROM receitas_esporadicas re
    LEFT JOIN clientes c ON re.cliente_id = c.id
    WHERE re.admin_id = ${adminId}
    ${filters?.cliente_id ? db`AND re.cliente_id = ${filters.cliente_id}` : db``}
    ${filters?.status ? db`AND re.status = ${filters.status}` : db``}
    ORDER BY re.data_receita DESC
  `;
  return resultado;
}

export async function obterReceitaEsporadicaPorId(id: string, adminId: string): Promise<ReceitaEsporadica | null> {
  const resultado = await db<ReceitaEsporadica[]>`
    SELECT * FROM receitas_esporadicas
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado[0] || null;
}

export async function atualizarReceitaEsporadica(
  id: string,
  adminId: string,
  data: Partial<ReceitaEsporadica>
): Promise<ReceitaEsporadica | null> {
  const receita = await obterReceitaEsporadicaPorId(id, adminId);
  if (!receita) return null;

  const cliente_id = data.cliente_id ?? receita.cliente_id;
  const descricao = data.descricao ?? receita.descricao;
  const valor = data.valor ?? receita.valor;
  const data_receita = data.data_receita ?? receita.data_receita;
  const tipo = data.tipo !== undefined ? data.tipo : (receita.tipo ?? null);
  const status = data.status ?? receita.status;
  const observacoes = data.observacoes !== undefined ? data.observacoes : (receita.observacoes ?? null);

  const resultado = await db<ReceitaEsporadica[]>`
    UPDATE receitas_esporadicas
    SET
      cliente_id = ${cliente_id},
      descricao = ${descricao},
      valor = ${valor},
      data_receita = ${data_receita},
      tipo = ${tipo},
      status = ${status},
      observacoes = ${observacoes},
      atualizada_em = NOW()
    WHERE id = ${id} AND admin_id = ${adminId}
    RETURNING *
  `;

  return resultado[0] || null;
}

export async function marcarComoRecebida(id: string, adminId: string): Promise<ReceitaEsporadica | null> {
  return atualizarReceitaEsporadica(id, adminId, { status: 'recebido' });
}

export async function deletarReceitaEsporadica(id: string, adminId: string): Promise<boolean> {
  const resultado = await db`
    DELETE FROM receitas_esporadicas
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado.count > 0;
}
