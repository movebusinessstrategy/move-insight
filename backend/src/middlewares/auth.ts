import type { Request, Response, NextFunction } from 'express';
import type { UserSession, ClienteSession } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      adminUser?: UserSession;
      clienteUser?: ClienteSession;
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const sessionJson = req.cookies.admin_session;

    if (!sessionJson) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const user: UserSession = JSON.parse(sessionJson);
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessão inválida' });
  }
}

export function requireClienteAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const sessionJson = req.cookies.cliente_session;

    if (!sessionJson) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const cliente: ClienteSession = JSON.parse(sessionJson);
    req.clienteUser = cliente;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessão inválida' });
  }
}
