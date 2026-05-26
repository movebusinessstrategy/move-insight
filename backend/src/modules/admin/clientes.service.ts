import { db } from '../../db/client.js';

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
      contatos
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
      contatos
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
