CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  email VARCHAR,
  telefone VARCHAR,
  cnpj_cpf VARCHAR,
  categoria VARCHAR,
  endereco TEXT,
  cidade VARCHAR,
  estado VARCHAR,
  cep VARCHAR,
  condicoes_pagamento VARCHAR DEFAULT 'a_combinar',
  dias_prazo INTEGER,
  observacoes TEXT,
  status VARCHAR DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criada_em TIMESTAMP DEFAULT NOW(),
  atualizada_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_admin_id ON fornecedores(admin_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_status ON fornecedores(status);

CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  descricao VARCHAR NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  categoria VARCHAR,
  observacoes TEXT,
  comprovante_url VARCHAR,
  criada_em TIMESTAMP DEFAULT NOW(),
  atualizada_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_admin_id ON contas_pagar(admin_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor ON contas_pagar(fornecedor_id);

CREATE TABLE IF NOT EXISTS receitas_esporadicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao VARCHAR NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_receita DATE NOT NULL,
  tipo VARCHAR,
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'cancelado')),
  observacoes TEXT,
  criada_em TIMESTAMP DEFAULT NOW(),
  atualizada_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receitas_admin_id ON receitas_esporadicas(admin_id);
CREATE INDEX IF NOT EXISTS idx_receitas_cliente ON receitas_esporadicas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas_esporadicas(data_receita);
CREATE INDEX IF NOT EXISTS idx_receitas_status ON receitas_esporadicas(status);
