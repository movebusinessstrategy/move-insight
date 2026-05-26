import { randomUUID } from 'node:crypto';
import { db } from '../../db/client.js';
import { gerarRelatorio, formatarRelatorioWhatsApp } from '../../services/meta-ads.js';

export interface ClienteComFinanceiro {
  id: string;
  nome: string;
  email: string;
  valor_mensal: number | null;
  dia_vencimento: number | null;
  status: string;
  report_frequency: string;
  billing_reminder_active: boolean;
  contatos: { whatsapp?: string }[];
  meta_ads_account_id?: string;
  relatorio_frequencia?: string;
  whatsapp_numero?: string;
  tipo_pessoa?: string;
  cpf_cnpj?: string;
  nome_fantasia?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  data_inicio_trabalhos?: string;
}

export async function criarCliente(dados: {
  nome: string;
  email: string;
  valor_mensal?: number | null;
  dia_vencimento?: number | null;
  tipo_pessoa?: string;
  cpf_cnpj?: string;
  nome_fantasia?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  meta_ads_account_id?: string;
  data_inicio_trabalhos?: string;
}): Promise<ClienteComFinanceiro> {
  const id = randomUUID();

  const result = await db`
    INSERT INTO clientes (
      id, nome, email, valor_mensal, dia_vencimento, status, report_frequency, billing_reminder_active,
      tipo_pessoa, cpf_cnpj, nome_fantasia, endereco, cidade, estado, cep, telefone, meta_ads_account_id, data_inicio_trabalhos
    )
    VALUES (
      ${id},
      ${dados.nome},
      ${dados.email},
      ${dados.valor_mensal || null},
      ${dados.dia_vencimento || null},
      'ativo',
      'semanal',
      true,
      ${dados.tipo_pessoa || 'pf'},
      ${dados.cpf_cnpj || null},
      ${dados.nome_fantasia || null},
      ${dados.endereco || null},
      ${dados.cidade || null},
      ${dados.estado || null},
      ${dados.cep || null},
      ${dados.telefone || null},
      ${dados.meta_ads_account_id || null},
      ${dados.data_inicio_trabalhos || null}
    )
    RETURNING id, nome, email, valor_mensal, dia_vencimento, status, report_frequency, billing_reminder_active, contatos, meta_ads_account_id, relatorio_frequencia, tipo_pessoa, cpf_cnpj, nome_fantasia, endereco, cidade, estado, cep, telefone, data_inicio_trabalhos
  `;

  const c = result[0] as any;
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    valor_mensal: c.valor_mensal,
    dia_vencimento: c.dia_vencimento,
    status: c.status,
    report_frequency: c.report_frequency,
    billing_reminder_active: c.billing_reminder_active,
    contatos: c.contatos || [],
    meta_ads_account_id: c.meta_ads_account_id,
    relatorio_frequencia: c.relatorio_frequencia,
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj,
    nome_fantasia: c.nome_fantasia,
    endereco: c.endereco,
    cidade: c.cidade,
    estado: c.estado,
    cep: c.cep,
    telefone: c.telefone,
    data_inicio_trabalhos: c.data_inicio_trabalhos,
  };
}

export async function listarClientesComFinanceiro(): Promise<ClienteComFinanceiro[]> {
  const clientes = await db`
    SELECT
      id,
      nome,
      email,
      valor_mensal,
      dia_vencimento,
      status,
      report_frequency,
      billing_reminder_active,
      contatos,
      meta_ads_account_id,
      relatorio_frequencia,
      whatsapp_numero,
      tipo_pessoa,
      cpf_cnpj,
      nome_fantasia,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      data_inicio_trabalhos
    FROM clientes
    ORDER BY nome ASC
  `;

  return clientes.map((c: any) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    valor_mensal: c.valor_mensal,
    dia_vencimento: c.dia_vencimento,
    status: c.status,
    report_frequency: c.report_frequency,
    billing_reminder_active: c.billing_reminder_active,
    contatos: c.contatos || [],
    meta_ads_account_id: c.meta_ads_account_id,
    relatorio_frequencia: c.relatorio_frequencia,
    whatsapp_numero: c.whatsapp_numero,
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj,
    nome_fantasia: c.nome_fantasia,
    endereco: c.endereco,
    cidade: c.cidade,
    estado: c.estado,
    cep: c.cep,
    telefone: c.telefone,
    data_inicio_trabalhos: c.data_inicio_trabalhos,
  }));
}

export async function obterClientePorId(clienteId: string): Promise<ClienteComFinanceiro | null> {
  const result = await db`
    SELECT
      id,
      nome,
      email,
      valor_mensal,
      dia_vencimento,
      status,
      report_frequency,
      billing_reminder_active,
      contatos,
      meta_ads_account_id,
      relatorio_frequencia,
      whatsapp_numero,
      tipo_pessoa,
      cpf_cnpj,
      nome_fantasia,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      data_inicio_trabalhos
    FROM clientes
    WHERE id = ${clienteId}
  `;

  if (result.length === 0) return null;

  const c = result[0] as any;
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    valor_mensal: c.valor_mensal,
    dia_vencimento: c.dia_vencimento,
    status: c.status,
    report_frequency: c.report_frequency,
    billing_reminder_active: c.billing_reminder_active,
    contatos: c.contatos || [],
    meta_ads_account_id: c.meta_ads_account_id,
    relatorio_frequencia: c.relatorio_frequencia,
    whatsapp_numero: c.whatsapp_numero,
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj,
    nome_fantasia: c.nome_fantasia,
    endereco: c.endereco,
    cidade: c.cidade,
    estado: c.estado,
    cep: c.cep,
    telefone: c.telefone,
    data_inicio_trabalhos: c.data_inicio_trabalhos,
  };
}

export async function enviarLembrancePagamento(
  clienteId: string,
  sendMessage?: (numero: string, mensagem: string) => Promise<string | null>,
): Promise<void> {
  const cliente = await obterClientePorId(clienteId);

  if (!cliente) {
    throw new Error('Cliente não encontrado');
  }

  if (!cliente.billing_reminder_active) {
    throw new Error('Lembrete de pagamento desabilitado para este cliente');
  }

  const whatsapp = cliente.contatos?.[0]?.whatsapp;
  if (!whatsapp) {
    throw new Error('Cliente não possui WhatsApp cadastrado');
  }

  const mensagem = `
*LEMBRETE DE PAGAMENTO*

Olá ${cliente.nome}!

Segue abaixo os dados da sua fatura:

💰 *Valor:* R$ ${cliente.valor_mensal?.toFixed(2) || 'N/A'}
📅 *Vencimento:* Dia ${cliente.dia_vencimento || 'N/A'} do mês

Por favor, realize o pagamento no prazo.

Dúvidas? Nos contact via WhatsApp.

Atenciosamente,
MOVE Insights
  `.trim();

  let msgId: string | null = null;
  let status = 'pendente';

  try {
    if (sendMessage) {
      msgId = await sendMessage(whatsapp, mensagem);
      status = msgId ? 'enviado' : 'erro';
    }
  } catch (_error) {
    status = 'erro';
  }

  await db`
    INSERT INTO mensagens_enviadas (id, cliente_id, tipo, status, conteudo, whatsapp_msg_id)
    VALUES (
      gen_random_uuid(),
      ${clienteId},
      'lembrete_pagamento',
      ${status},
      ${mensagem},
      ${msgId}
    )
  `;
}

export async function atualizarCliente(
  clienteId: string,
  dados: {
    tipo_pessoa?: string;
    nome?: string;
    email?: string;
    cpf_cnpj?: string | null;
    nome_fantasia?: string | null;
    telefone?: string | null;
    whatsapp_numero?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    data_inicio_trabalhos?: string | null;
    valor_mensal?: number | null;
    dia_vencimento?: number | null;
    meta_ads_account_id?: string | null;
    relatorio_frequencia?: 'nunca' | 'semanal' | 'mensal';
  },
): Promise<ClienteComFinanceiro | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (dados.tipo_pessoa !== undefined) {
    updates.push(`tipo_pessoa = $${paramCount++}`);
    values.push(dados.tipo_pessoa);
  }
  if (dados.nome !== undefined) {
    updates.push(`nome = $${paramCount++}`);
    values.push(dados.nome);
  }
  if (dados.email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(dados.email);
  }
  if (dados.cpf_cnpj !== undefined) {
    updates.push(`cpf_cnpj = $${paramCount++}`);
    values.push(dados.cpf_cnpj);
  }
  if (dados.nome_fantasia !== undefined) {
    updates.push(`nome_fantasia = $${paramCount++}`);
    values.push(dados.nome_fantasia);
  }
  if (dados.telefone !== undefined) {
    updates.push(`telefone = $${paramCount++}`);
    values.push(dados.telefone);
  }
  if (dados.whatsapp_numero !== undefined) {
    updates.push(`whatsapp_numero = $${paramCount++}`);
    values.push(dados.whatsapp_numero);
  }
  if (dados.endereco !== undefined) {
    updates.push(`endereco = $${paramCount++}`);
    values.push(dados.endereco);
  }
  if (dados.cidade !== undefined) {
    updates.push(`cidade = $${paramCount++}`);
    values.push(dados.cidade);
  }
  if (dados.estado !== undefined) {
    updates.push(`estado = $${paramCount++}`);
    values.push(dados.estado);
  }
  if (dados.cep !== undefined) {
    updates.push(`cep = $${paramCount++}`);
    values.push(dados.cep);
  }
  if (dados.data_inicio_trabalhos !== undefined) {
    updates.push(`data_inicio_trabalhos = $${paramCount++}`);
    values.push(dados.data_inicio_trabalhos);
  }
  if (dados.valor_mensal !== undefined) {
    updates.push(`valor_mensal = $${paramCount++}`);
    values.push(dados.valor_mensal);
  }
  if (dados.dia_vencimento !== undefined) {
    updates.push(`dia_vencimento = $${paramCount++}`);
    values.push(dados.dia_vencimento);
  }
  if (dados.meta_ads_account_id !== undefined) {
    updates.push(`meta_ads_account_id = $${paramCount++}`);
    values.push(dados.meta_ads_account_id);
  }
  if (dados.relatorio_frequencia !== undefined) {
    updates.push(`relatorio_frequencia = $${paramCount++}`);
    values.push(dados.relatorio_frequencia);
  }

  if (updates.length === 0) return obterClientePorId(clienteId);

  values.push(clienteId);
  const query = `
    UPDATE clientes
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, nome, email, valor_mensal, dia_vencimento, status, report_frequency, billing_reminder_active, contatos, meta_ads_account_id, relatorio_frequencia, whatsapp_numero, tipo_pessoa, cpf_cnpj, nome_fantasia, endereco, cidade, estado, cep, telefone, data_inicio_trabalhos
  `;

  const result = await db.unsafe(query, values);

  if (result.length === 0) return null;

  const c = result[0] as any;
  return {
    id: c.id,
    nome: c.nome,
    email: c.email,
    valor_mensal: c.valor_mensal,
    dia_vencimento: c.dia_vencimento,
    status: c.status,
    report_frequency: c.report_frequency,
    billing_reminder_active: c.billing_reminder_active,
    contatos: c.contatos || [],
    meta_ads_account_id: c.meta_ads_account_id,
    relatorio_frequencia: c.relatorio_frequencia,
    whatsapp_numero: c.whatsapp_numero,
    tipo_pessoa: c.tipo_pessoa,
    cpf_cnpj: c.cpf_cnpj,
    nome_fantasia: c.nome_fantasia,
    endereco: c.endereco,
    cidade: c.cidade,
    estado: c.estado,
    cep: c.cep,
    telefone: c.telefone,
    data_inicio_trabalhos: c.data_inicio_trabalhos,
  };
}

export async function enviarLembracaPagamentoBatch(
  clienteIds: string[],
  sendMessage?: (numero: string, mensagem: string) => Promise<string | null>,
): Promise<{ enviados: number; falhados: number; detalhes: Array<{ clienteId: string; status: string; erro?: string }> }> {
  const detalhes: Array<{ clienteId: string; status: string; erro?: string }> = [];
  let enviados = 0;
  let falhados = 0;

  for (const clienteId of clienteIds) {
    try {
      await enviarLembrancePagamento(clienteId, sendMessage);
      detalhes.push({ clienteId, status: 'enviado' });
      enviados++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      detalhes.push({ clienteId, status: 'erro', erro: errorMsg });
      falhados++;
    }
  }

  return { enviados, falhados, detalhes };
}

export async function atualizarClientesBatch(
  clienteIds: string[],
  updates: {
    billing_reminder_active?: boolean;
    relatorio_frequencia?: 'nunca' | 'semanal' | 'mensal';
    status?: 'ativo' | 'inativo';
  },
): Promise<{ atualizados: number; falhados: number; detalhes: Array<{ clienteId: string; status: string; erro?: string }> }> {
  const detalhes: Array<{ clienteId: string; status: string; erro?: string }> = [];
  let atualizados = 0;
  let falhados = 0;

  for (const clienteId of clienteIds) {
    try {
      await atualizarCliente(clienteId, updates);
      detalhes.push({ clienteId, status: 'atualizado' });
      atualizados++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      detalhes.push({ clienteId, status: 'erro', erro: errorMsg });
      falhados++;
    }
  }

  return { atualizados, falhados, detalhes };
}

export async function enviarRelatorioWhatsApp(
  clienteId: string,
  frequencia: 'semanal' | 'mensal',
  sendMessage?: (numero: string, mensagem: string) => Promise<string | null>,
): Promise<void> {
  const cliente = await obterClientePorId(clienteId);

  if (!cliente) {
    throw new Error('Cliente não encontrado');
  }

  if (!cliente.whatsapp_numero && (!cliente.contatos || !cliente.contatos[0]?.whatsapp)) {
    throw new Error('Cliente não possui WhatsApp cadastrado');
  }

  if (!cliente.meta_ads_account_id) {
    throw new Error('Cliente não possui Meta Ads account configurado');
  }

  const whatsappNumber = (cliente.whatsapp_numero || cliente.contatos?.[0]?.whatsapp) as string;
  const period = frequencia === 'semanal' ? 'last_7d' : 'last_30d';

  const relatorio = await gerarRelatorio(cliente.meta_ads_account_id, period);
  const mensagem = formatarRelatorioWhatsApp(relatorio);

  let msgId: string | null = null;
  let status = 'pendente';

  try {
    if (sendMessage) {
      msgId = await sendMessage(whatsappNumber, mensagem);
      status = msgId ? 'enviado' : 'erro';
    }
  } catch (_error) {
    status = 'erro';
  }

  await db`
    INSERT INTO mensagens_enviadas (id, cliente_id, tipo, status, conteudo, whatsapp_msg_id)
    VALUES (
      gen_random_uuid(),
      ${clienteId},
      ${'relatorio_' + frequencia},
      ${status},
      ${mensagem},
      ${msgId}
    )
  `;
}
