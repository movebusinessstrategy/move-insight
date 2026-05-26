import type { Request, Response } from 'express';
import { loginAdmin } from './admin.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function handleAdminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await loginAdmin({ email, senha });

    // Salvar sessão no cookie
    res.cookie('admin_session', JSON.stringify(user), COOKIE_OPTIONS);

    res.status(200).json({
      message: 'Login realizado com sucesso',
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer login';
    res.status(401).json({ error: message });
  }
}

export async function handleAdminLogout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('admin_session');
  res.status(200).json({ message: 'Logout realizado com sucesso' });
}

export function handleAdminMe(req: Request, res: Response): void {
  const user = (req as any).adminUser;
  res.status(200).json({ user });
}
