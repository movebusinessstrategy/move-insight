-- Clientes cadastrados pela equipe
CREATE TABLE IF NOT EXISTS clientes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                        TEXT NOT NULL,
  empresa                     TEXT,
  nicho                       TEXT,
  email                       TEXT,
  ad_accounts                 JSONB NOT NULL DEFAULT '[]',
  contatos                    JSONB NOT NULL DEFAULT '[]',
  valor_mensal                NUMERIC(10,2),
  data_inicio                 DATE,
  dia_vencimento              INT,
  status                      TEXT NOT NULL DEFAULT 'ativo',
  report_frequency            TEXT NOT NULL DEFAULT 'semanal',
  report_day                  TEXT NOT NULL DEFAULT 'monday',
  report_hour                 INT NOT NULL DEFAULT 9,
  report_timezone             TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  report_active               BOOLEAN NOT NULL DEFAULT true,
  report_template             TEXT,
  billing_reminder_days_before INT DEFAULT 5,
  billing_reminder_active      BOOLEAN DEFAULT true,
  billing_reminder_template    TEXT,
  observacoes                 TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_dia_vencimento ON clientes(dia_vencimento);
