import bcrypt from 'bcryptjs';
import { db } from '../../db/client.js';
import type { ClienteSession, AuthRequest } from '../../types/index.js';

export async function loginCliente(req: AuthRequest): Promise<ClienteSession> {
  const { email, senha } = req;

  const result = await db`
    SELECT cl.id, cl.cliente_id, cl.email, cl.senha_hash, cl.senha_provisoria, c.nome
    FROM cliente_logins cl
    JOIN clientes c ON c.id = cl.cliente_id
    WHERE cl.email = ${email} AND cl.ativo = true
  `;

  if (result.length === 0) {
    throw new Error('Email ou senha inválidos');
  }

  const cliente = result[0];

  const senhaValida = await bcrypt.compare(senha, cliente.senha_hash);
  if (!senhaValida) {
    throw new Error('Email ou senha inválidos');
  }

  // Atualizar last_login_at
  await db`
    UPDATE cliente_logins
    SET last_login_at = now()
    WHERE id = ${cliente.id}
  `;

  return {
    id: cliente.id,
    cliente_id: cliente.cliente_id,
    email: cliente.email,
    cliente_nome: cliente.nome,
    senha_provisoria: cliente.senha_provisoria,
  };
}
