CREATE TABLE IF NOT EXISTS faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'paga', 'atrasada', 'cancelada')),
  data_pagamento TIMESTAMP,
  observacoes TEXT,
  criada_em TIMESTAMP DEFAULT NOW(),
  atualizada_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(cliente_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_faturas_cliente_id ON faturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_data_vencimento ON faturas(data_vencimento);
