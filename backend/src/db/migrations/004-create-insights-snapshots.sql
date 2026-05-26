-- Snapshots de insights (Meta API)
CREATE TABLE insights_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE CASCADE,
  ad_account_id   TEXT NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_type     TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  spend           NUMERIC(12,2),
  impressions     BIGINT,
  reach           BIGINT,
  clicks          BIGINT,
  ctr             NUMERIC(6,3),
  cpc             NUMERIC(10,2),
  cpm             NUMERIC(10,2),
  frequency       NUMERIC(6,2),
  leads           INT,
  messaging_started INT,
  purchases       INT,
  purchase_value  NUMERIC(12,2),
  campaigns       JSONB,
  ads             JSONB,
  demographics    JSONB,
  daily_series    JSONB,
  raw_response    JSONB
);

CREATE INDEX idx_snapshots_cliente_fetched ON insights_snapshots(cliente_id, fetched_at DESC);
CREATE INDEX idx_snapshots_period ON insights_snapshots(period_type, period_start, period_end);
