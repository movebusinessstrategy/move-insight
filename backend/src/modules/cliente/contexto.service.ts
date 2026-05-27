import { db } from '../../db/client.js';

export interface ClienteContexto {
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

/**
 * Fetch context data for a specific client (cliente_id)
 */
export async function obterContextoCliente(clienteId: string): Promise<ClienteContexto> {
  const contexto = await db<ClienteContexto[]>`
    SELECT id, cliente_id, descricao_empresa, produtos_servicos, localizacao, estrategia, tom_marca, publico_alvo, created_at, updated_at
    FROM cliente_contexto
    WHERE cliente_id = ${clienteId}
  `;

  if (contexto.length === 0) {
    // Create empty contexto if doesn't exist
    const newContexto = await db<ClienteContexto[]>`
      INSERT INTO cliente_contexto (cliente_id)
      VALUES (${clienteId})
      RETURNING id, cliente_id, descricao_empresa, produtos_servicos, localizacao, estrategia, tom_marca, publico_alvo, created_at, updated_at
    `;
    return newContexto[0];
  }

  return contexto[0];
}

/**
 * Update context data for a specific client
 */
export async function atualizarContextoCliente(
  clienteId: string,
  dados: {
    descricao_empresa?: string;
    produtos_servicos?: string;
    localizacao?: string;
    estrategia?: string;
    tom_marca?: string;
    publico_alvo?: string;
  }
): Promise<ClienteContexto> {
  // Verify cliente exists
  const cliente = await db`
    SELECT id FROM clientes WHERE id = ${clienteId}
  `;

  if (cliente.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  // Ensure contexto exists first
  const existe = await db`
    SELECT id FROM cliente_contexto WHERE cliente_id = ${clienteId}
  `;

  if (existe.length === 0) {
    await db`
      INSERT INTO cliente_contexto (cliente_id)
      VALUES (${clienteId})
    `;
  }

  // Update with provided fields
  const atualizacao = await db<ClienteContexto[]>`
    UPDATE cliente_contexto
    SET
      descricao_empresa = COALESCE(${dados.descricao_empresa || null}, descricao_empresa),
      produtos_servicos = COALESCE(${dados.produtos_servicos || null}, produtos_servicos),
      localizacao = COALESCE(${dados.localizacao || null}, localizacao),
      estrategia = COALESCE(${dados.estrategia || null}, estrategia),
      tom_marca = COALESCE(${dados.tom_marca || null}, tom_marca),
      publico_alvo = COALESCE(${dados.publico_alvo || null}, publico_alvo),
      updated_at = CURRENT_TIMESTAMP
    WHERE cliente_id = ${clienteId}
    RETURNING id, cliente_id, descricao_empresa, produtos_servicos, localizacao, estrategia, tom_marca, publico_alvo, created_at, updated_at
  `;

  return atualizacao[0];
}
