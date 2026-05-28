export interface UserSession {
  id: string;
  email: string;
  role: 'admin';
  nome: string;
}

export interface ClienteSession {
  id: string;
  cliente_id: string;
  email: string;
  nome?: string;
  cliente_nome?: string;
  senha_provisoria?: boolean;
}

export interface AuthRequest {
  email: string;
  senha: string;
}

export type SessionType = 'admin' | 'cliente';
