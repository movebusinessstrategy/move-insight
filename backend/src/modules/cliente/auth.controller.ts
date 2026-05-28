import type { Request, Response } from 'express';
import { loginCliente } from './auth.service.js';

export async function handleClienteLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const { token, cliente } = await loginCliente({ email, senha });

    res.status(200).json({
      message: 'Login realizado com sucesso',
      token,
      cliente,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer login';
    res.status(401).json({ error: message });
  }
}

export function handleClienteMe(req: Request, res: Response): void {
  const cliente = (req as any).clienteUser;
  res.status(200).json({ cliente });
}

export function handleClienteLogout(_req: Request, res: Response): void {
  res.status(200).json({ message: 'Logout realizado com sucesso' });
}
