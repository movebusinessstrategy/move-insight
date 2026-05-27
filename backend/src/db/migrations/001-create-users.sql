-- Usuários da equipe (admin)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  senha_hash      TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'admin',
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo);
