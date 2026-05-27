-- Contexto do cliente para IA futura
CREATE TABLE IF NOT EXISTS cliente_contexto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID UNIQUE NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao_empresa TEXT,
  produtos_servicos TEXT,
  localizacao VARCHAR,
  estrategia TEXT,
  tom_marca VARCHAR,
  publico_alvo TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cliente_contexto_cliente ON cliente_contexto(cliente_id);
