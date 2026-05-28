import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserSession, ClienteSession } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cliente-secret-key-move-insights';

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
    // Tenta JWT token primeiro (Authorization: Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.clienteUser = {
        id: decoded.id,
        cliente_id: decoded.cliente_id,
        email: decoded.email,
        nome: decoded.nome,
      };
      next();
      return;
    }

    // Fallback para cookie (backwards compatibility)
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
