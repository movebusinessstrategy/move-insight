import bcrypt from 'bcryptjs';
import { db } from '../../db/client.js';
import type { UserSession, AuthRequest } from '../../types/index.js';

export async function registerAdmin(req: {
  email: string;
  senha: string;
  nome: string;
}): Promise<UserSession> {
  const { email, senha, nome } = req;

  // Validar campos
  if (!email || !senha || !nome) {
    throw new Error('Email, senha e nome são obrigatórios');
  }

  if (senha.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  // Verificar se email já existe
  const exists = await db`
    SELECT id FROM users WHERE email = ${email}
  `;

  if (exists.length > 0) {
    throw new Error('Email já cadastrado');
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  // Criar usuário
  const result = await db`
    INSERT INTO users (id, email, nome, senha_hash, role, ativo, created_at)
    VALUES (gen_random_uuid(), ${email}, ${nome}, ${senhaHash}, 'admin', true, NOW())
    RETURNING id, email, nome, role
  `;

  const user = result[0];

  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
  };
}

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
