import type { Request, Response } from 'express';
import { loginCliente } from './cliente.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function handleClienteLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const cliente = await loginCliente({ email, senha });

    // Salvar sessão no cookie
    res.cookie('cliente_session', JSON.stringify(cliente), COOKIE_OPTIONS);

    res.status(200).json({
      message: 'Login realizado com sucesso',
      cliente,
      senha_provisoria: cliente.senha_provisoria,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer login';
    res.status(401).json({ error: message });
  }
}

export async function handleClienteLogout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('cliente_session');
  res.status(200).json({ message: 'Logout realizado com sucesso' });
}
