-- Análises e resultados da IA (Claude API)
CREATE TABLE IF NOT EXISTS analises_ia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  periodo_inicio  DATE NOT NULL,
  periodo_fim     DATE NOT NULL,
  analise_texto   TEXT NOT NULL,
  recomendacoes   JSONB,
  tokens_input    INT NOT NULL,
  tokens_output   INT NOT NULL,
  custo_usd       NUMERIC(8,4) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed',
  criada_por      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analises_cliente ON analises_ia(cliente_id);
CREATE INDEX IF NOT EXISTS idx_analises_periodo ON analises_ia(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_analises_created ON analises_ia(created_at DESC);
