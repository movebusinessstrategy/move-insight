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

export async function trocarSenhaCliente(clienteLoginId: string, senhaAtual: string, novaSenha: string): Promise<void> {
  const result = await db`
    SELECT senha_hash FROM cliente_logins WHERE id = ${clienteLoginId}
  `;

  if (result.length === 0) {
    throw new Error('Cliente não encontrado');
  }

  const cliente = result[0];
  const senhaValida = await bcrypt.compare(senhaAtual, cliente.senha_hash);
  if (!senhaValida) {
    throw new Error('Senha atual inválida');
  }

  if (novaSenha.length < 6) {
    throw new Error('Nova senha deve ter no mínimo 6 caracteres');
  }

  const novaHash = await bcrypt.hash(novaSenha, 10);

  await db`
    UPDATE cliente_logins
    SET senha_hash = ${novaHash}, senha_provisoria = false
    WHERE id = ${clienteLoginId}
  `;
}
