import bcrypt from 'bcryptjs';
import { db } from '../../db/client.js';
import type { UserSession, AuthRequest } from '../../types/index.js';

export async function loginAdmin(req: AuthRequest): Promise<UserSession> {
  const { email, senha } = req;

  const result = await db`
    SELECT id, email, nome, senha_hash, role, ativo
    FROM users
    WHERE email = ${email} AND role = 'admin'
  `;

  if (result.length === 0) {
    throw new Error('Email ou senha inválidos');
  }

  const user = result[0];

  if (!user.ativo) {
    throw new Error('Usuário inativo');
  }

  const senhaValida = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaValida) {
    throw new Error('Email ou senha inválidos');
  }

  // Atualizar last_login_at
  await db`
    UPDATE users
    SET last_login_at = now()
    WHERE id = ${user.id}
  `;

  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
  };
}
