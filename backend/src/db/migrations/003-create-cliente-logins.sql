-- Credenciais de login do cliente final
CREATE TABLE IF NOT EXISTS cliente_logins (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL UNIQUE,
  senha_hash              TEXT NOT NULL,
  ativo                   BOOLEAN NOT NULL DEFAULT true,
  senha_provisoria        BOOLEAN NOT NULL DEFAULT true,
  ultima_alteracao_senha  TIMESTAMPTZ,
  last_login_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  created_by              UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_logins_cliente ON cliente_logins(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_logins_email ON cliente_logins(email);
