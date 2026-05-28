import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/client.js';
import type { ClienteSession } from '../../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cliente-secret-key-move-insights';

export interface ClienteLoginRequest {
  email: string;
  senha: string;
}

export async function loginCliente(req: ClienteLoginRequest): Promise<{
  token: string;
  cliente: ClienteSession;
}> {
  const { email, senha } = req;

  const result = await db`
    SELECT cl.id, cl.cliente_id, cl.email, cl.senha_hash, cl.ativo, c.nome as cliente_nome
    FROM cliente_logins cl
    JOIN clientes c ON c.id = cl.cliente_id
    WHERE cl.email = ${email} AND cl.ativo = true
  `;

  if (result.length === 0) {
    throw new Error('Email ou senha inválidos');
  }

  const clienteLogin = result[0];

  const senhaValida = await bcrypt.compare(senha, clienteLogin.senha_hash);
  if (!senhaValida) {
    throw new Error('Email ou senha inválidos');
  }

  // Atualizar last_login_at
  await db`
    UPDATE cliente_logins
    SET last_login_at = now()
    WHERE id = ${clienteLogin.id}
  `;

  const token = jwt.sign(
    {
      id: clienteLogin.id,
      cliente_id: clienteLogin.cliente_id,
      email: clienteLogin.email,
      nome: clienteLogin.cliente_nome,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    cliente: {
      id: clienteLogin.id,
      cliente_id: clienteLogin.cliente_id,
      email: clienteLogin.email,
      nome: clienteLogin.cliente_nome,
    },
  };
}

export async function verifyClienteToken(token: string): Promise<ClienteSession> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      cliente_id: decoded.cliente_id,
      email: decoded.email,
      nome: decoded.nome,
    };
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
}
