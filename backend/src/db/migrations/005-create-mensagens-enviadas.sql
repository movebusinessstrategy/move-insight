-- Registro de mensagens enviadas via WhatsApp
CREATE TABLE mensagens_enviadas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  destinatario_phone TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  whatsapp_msg_id TEXT,
  triggered_by    TEXT NOT NULL,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mensagens_cliente ON mensagens_enviadas(cliente_id);
CREATE INDEX idx_mensagens_status ON mensagens_enviadas(status);
CREATE INDEX idx_mensagens_created ON mensagens_enviadas(created_at DESC);
