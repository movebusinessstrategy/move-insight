import { db } from '../../db/client.js';

export interface Fornecedor {
  id: string;
  admin_id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cnpj_cpf?: string;
  categoria?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  condicoes_pagamento?: string;
  dias_prazo?: number;
  observacoes?: string;
  status: string;
  criada_em: string;
  atualizada_em: string;
}

export async function criarFornecedor(
  adminId: string,
  data: {
    nome: string;
    email?: string;
    telefone?: string;
    cnpj_cpf?: string;
    categoria?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    condicoes_pagamento?: string;
    dias_prazo?: number;
    observacoes?: string;
  }
): Promise<Fornecedor> {
  const resultado = await db<Fornecedor[]>`
    INSERT INTO fornecedores (
      admin_id, nome, email, telefone, cnpj_cpf, categoria,
      endereco, cidade, estado, cep, condicoes_pagamento, dias_prazo, observacoes
    ) VALUES (
      ${adminId}, ${data.nome}, ${data.email || null}, ${data.telefone || null},
      ${data.cnpj_cpf || null}, ${data.categoria || null}, ${data.endereco || null},
      ${data.cidade || null}, ${data.estado || null}, ${data.cep || null},
      ${data.condicoes_pagamento || 'a_combinar'}, ${data.dias_prazo || null}, ${data.observacoes || null}
    )
    RETURNING *
  `;
  return resultado[0];
}

export async function listarFornecedores(adminId: string): Promise<Fornecedor[]> {
  return db<Fornecedor[]>`
    SELECT * FROM fornecedores
    WHERE admin_id = ${adminId}
    ORDER BY criada_em DESC
  `;
}

export async function obterFornecedorPorId(id: string, adminId: string): Promise<Fornecedor | null> {
  const resultado = await db<Fornecedor[]>`
    SELECT * FROM fornecedores
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado[0] || null;
}

export async function atualizarFornecedor(
  id: string,
  adminId: string,
  data: Partial<Fornecedor>
): Promise<Fornecedor | null> {
  const fornecedor = await obterFornecedorPorId(id, adminId);
  if (!fornecedor) return null;

  const nome = data.nome ?? fornecedor.nome;
  const email = data.email !== undefined ? data.email : (fornecedor.email ?? null);
  const telefone = data.telefone !== undefined ? data.telefone : (fornecedor.telefone ?? null);
  const cnpj_cpf = data.cnpj_cpf !== undefined ? data.cnpj_cpf : (fornecedor.cnpj_cpf ?? null);
  const categoria = data.categoria !== undefined ? data.categoria : (fornecedor.categoria ?? null);
  const endereco = data.endereco !== undefined ? data.endereco : (fornecedor.endereco ?? null);
  const cidade = data.cidade !== undefined ? data.cidade : (fornecedor.cidade ?? null);
  const estado = data.estado !== undefined ? data.estado : (fornecedor.estado ?? null);
  const cep = data.cep !== undefined ? data.cep : (fornecedor.cep ?? null);
  const condicoes_pagamento = data.condicoes_pagamento ?? (fornecedor.condicoes_pagamento ?? null);
  const dias_prazo = data.dias_prazo !== undefined ? data.dias_prazo : (fornecedor.dias_prazo ?? null);
  const observacoes = data.observacoes !== undefined ? data.observacoes : (fornecedor.observacoes ?? null);
  const status = data.status ?? fornecedor.status;

  const resultado = await db<Fornecedor[]>`
    UPDATE fornecedores
    SET
      nome = ${nome},
      email = ${email},
      telefone = ${telefone},
      cnpj_cpf = ${cnpj_cpf},
      categoria = ${categoria},
      endereco = ${endereco},
      cidade = ${cidade},
      estado = ${estado},
      cep = ${cep},
      condicoes_pagamento = ${condicoes_pagamento},
      dias_prazo = ${dias_prazo},
      observacoes = ${observacoes},
      status = ${status},
      atualizada_em = NOW()
    WHERE id = ${id} AND admin_id = ${adminId}
    RETURNING *
  `;

  return resultado[0] || null;
}

export async function deletarFornecedor(id: string, adminId: string): Promise<boolean> {
  const resultado = await db`
    DELETE FROM fornecedores
    WHERE id = ${id} AND admin_id = ${adminId}
  `;
  return resultado.count > 0;
}
