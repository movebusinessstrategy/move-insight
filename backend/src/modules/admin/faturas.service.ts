import { db } from '../../db/client.js';
import { sendWhatsAppMessage } from '../../services/whatsapp.js';

export interface Fatura {
  id: string;
  cliente_id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  status: 'aberta' | 'paga' | 'atrasada' | 'cancelada';
  data_pagamento: string | null;
  observacoes: string | null;
  criada_em: string;
  atualizada_em: string;
}

export interface ResumoFinanceiro {
  totalFaturado: number;
  totalRecebido: number;
  totalEmAberto: number;
  totalAtrasado: number;
  proximoVencimento: string | null;
}

export async function gerarFaturasAutomaticamente(clienteId: string): Promise<void> {
  try {
    const cliente = await db`
      SELECT data_inicio_trabalhos, dia_vencimento, valor_mensal
      FROM clientes
      WHERE id = ${clienteId}
    `;

    if (cliente.length === 0 || !cliente[0].valor_mensal) return;

    const dataInicio = new Date(cliente[0].data_inicio_trabalhos || new Date());
    const hoje = new Date();
    const diaVencimento = cliente[0].dia_vencimento || 15;
    const valorMensal = cliente[0].valor_mensal;

    // Gerar faturas de cada mês desde a data de início até hoje
    let dataAtual = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);

    while (dataAtual <= hoje) {
      const mesReferencia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
      const dataVencimento = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), diaVencimento);

      // Verificar se a fatura já existe
      const faturaExistente = await db`
        SELECT id FROM faturas
        WHERE cliente_id = ${clienteId}
        AND mes_referencia = ${mesReferencia.toISOString().split('T')[0]}
      `;

      if (faturaExistente.length === 0) {
        // Criar fatura
        await db`
          INSERT INTO faturas (cliente_id, mes_referencia, valor, data_vencimento, status)
          VALUES (
            ${clienteId},
            ${mesReferencia.toISOString().split('T')[0]},
            ${valorMensal},
            ${dataVencimento.toISOString().split('T')[0]},
            'aberta'
          )
        `;
      }

      // Avançar para o próximo mês
      dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1);
    }

    // Atualizar status de faturas atrasadas
    const hoje_str = hoje.toISOString().split('T')[0];
    await db.unsafe(`
      UPDATE faturas
      SET status = 'atrasada'
      WHERE cliente_id = $1
      AND status = 'aberta'
      AND data_vencimento < $2
    `, [clienteId, hoje_str]);

  } catch (error) {
    console.error('Erro ao gerar faturas automaticamente:', error);
  }
}

export async function listarFaturas(clienteId: string): Promise<Fatura[]> {
  try {
    await gerarFaturasAutomaticamente(clienteId);

    const faturas = await db`
      SELECT
        id,
        cliente_id,
        mes_referencia,
        valor,
        data_vencimento,
        status,
        data_pagamento,
        observacoes,
        criada_em,
        atualizada_em
      FROM faturas
      WHERE cliente_id = ${clienteId}
      ORDER BY mes_referencia DESC
    `;

    return faturas.map((f: any) => ({
      id: f.id,
      cliente_id: f.cliente_id,
      mes_referencia: f.mes_referencia,
      valor: Number(f.valor),
      data_vencimento: f.data_vencimento,
      status: f.status,
      data_pagamento: f.data_pagamento,
      observacoes: f.observacoes,
      criada_em: f.criada_em,
      atualizada_em: f.atualizada_em,
    }));
  } catch (error) {
    console.error('Erro ao listar faturas:', error);
    return [];
  }
}

export async function registrarPagamento(
  faturaId: string,
  observacoes?: string
): Promise<Fatura | null> {
  try {
    const resultado = await db`
      UPDATE faturas
      SET
        status = 'paga',
        data_pagamento = NOW(),
        observacoes = ${observacoes || null},
        atualizada_em = NOW()
      WHERE id = ${faturaId}
      RETURNING
        id,
        cliente_id,
        mes_referencia,
        valor,
        data_vencimento,
        status,
        data_pagamento,
        observacoes,
        criada_em,
        atualizada_em
    `;

    if (resultado.length === 0) return null;

    const f = resultado[0] as any;
    return {
      id: f.id,
      cliente_id: f.cliente_id,
      mes_referencia: f.mes_referencia,
      valor: Number(f.valor),
      data_vencimento: f.data_vencimento,
      status: f.status,
      data_pagamento: f.data_pagamento,
      observacoes: f.observacoes,
      criada_em: f.criada_em,
      atualizada_em: f.atualizada_em,
    };
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return null;
  }
}

export async function obterResumoFinanceiro(clienteId: string): Promise<ResumoFinanceiro> {
  try {
    await gerarFaturasAutomaticamente(clienteId);

    const resultado = await db`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('paga', 'aberta', 'atrasada') THEN valor ELSE 0 END), 0) as total_faturado,
        COALESCE(SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END), 0) as total_recebido,
        COALESCE(SUM(CASE WHEN status IN ('aberta', 'atrasada') THEN valor ELSE 0 END), 0) as total_em_aberto,
        COALESCE(SUM(CASE WHEN status = 'atrasada' THEN valor ELSE 0 END), 0) as total_atrasado,
        MIN(CASE WHEN status IN ('aberta', 'atrasada') THEN data_vencimento ELSE NULL END) as proximo_vencimento
      FROM faturas
      WHERE cliente_id = ${clienteId}
    `;

    const r = resultado[0] as any;
    return {
      totalFaturado: Number(r.total_faturado),
      totalRecebido: Number(r.total_recebido),
      totalEmAberto: Number(r.total_em_aberto),
      totalAtrasado: Number(r.total_atrasado),
      proximoVencimento: r.proximo_vencimento,
    };
  } catch (error) {
    console.error('Erro ao obter resumo financeiro:', error);
    return {
      totalFaturado: 0,
      totalRecebido: 0,
      totalEmAberto: 0,
      totalAtrasado: 0,
      proximoVencimento: null,
    };
  }
}

export async function obterFaturamentoMensal(clienteId: string): Promise<{ mes: string; valor: number; recebido: number }[]> {
  try {
    const resultado = await db`
      SELECT
        to_char(mes_referencia, 'MM/YYYY') as mes,
        SUM(valor) as total_valor,
        SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END) as total_recebido
      FROM faturas
      WHERE cliente_id = ${clienteId}
      GROUP BY mes_referencia
      ORDER BY mes_referencia DESC
    `;

    return resultado.map((r: any) => ({
      mes: r.mes,
      valor: Number(r.total_valor),
      recebido: Number(r.total_recebido),
    }));
  } catch (error) {
    console.error('Erro ao obter faturamento mensal:', error);
    return [];
  }
}

export async function enviarReminderFatura(faturaId: string, numero: string): Promise<boolean> {
  try {
    const fatura = await db`
      SELECT f.*, c.nome as cliente_nome
      FROM faturas f
      JOIN clientes c ON f.cliente_id = c.id
      WHERE f.id = ${faturaId}
    `;

    if (fatura.length === 0) return false;

    const f = fatura[0] as any;
    const diasAteVencimento = Math.ceil(
      (new Date(f.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const statusEmojiMap: Record<string, string> = {
      paga: '✅',
      aberta: '⏳',
      atrasada: '⚠️',
      cancelada: '❌',
    };
    const statusEmoji = statusEmojiMap[f.status] || '📋';

    const mensagem = `*MOVE Insights* 📊\n\n${statusEmoji} Lembrete de Fatura\n\nCliente: ${f.cliente_nome}\nMês: ${new Date(f.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}\nValor: R$ ${Number(f.valor).toFixed(2)}\nVencimento: ${new Date(f.data_vencimento).toLocaleDateString('pt-BR')}\nStatus: ${f.status}\n${diasAteVencimento > 0 ? `Faltam ${diasAteVencimento} dias para vencimento` : 'VENCIDO'}`;

    const resultado = await sendWhatsAppMessage(numero, mensagem);
    return resultado !== null;
  } catch (error) {
    console.error('Erro ao enviar reminder de fatura:', error);
    return false;
  }
}

export async function enviarRelatorioFinanceiro(clienteId: string, numero: string): Promise<boolean> {
  try {
    const cliente = await db`SELECT nome FROM clientes WHERE id = ${clienteId}`;
    if (cliente.length === 0) return false;

    const resumo = await obterResumoFinanceiro(clienteId);
    const faturamentoMensal = await obterFaturamentoMensal(clienteId);

    const ultimosMeses = faturamentoMensal.slice(0, 3);
    const tabelaMeses = ultimosMeses.map((m) => `${m.mes}: R$ ${m.valor.toFixed(2)} (${m.recebido > 0 ? '✅' : '⏳'})`).join('\n');

    const mensagem = `*MOVE Insights* 📊\n\n📋 Relatório Financeiro\n\nCliente: ${cliente[0].nome}\n\n💰 *Resumo*\n├ Total Faturado: R$ ${resumo.totalFaturado.toFixed(2)}\n├ Total Recebido: ✅ R$ ${resumo.totalRecebido.toFixed(2)}\n├ Em Aberto: ⏳ R$ ${resumo.totalEmAberto.toFixed(2)}\n└ Atrasado: ⚠️ R$ ${resumo.totalAtrasado.toFixed(2)}\n\n📊 *Últimos 3 Meses*\n${tabelaMeses}\n\n${resumo.proximoVencimento ? `📅 Próximo vencimento: ${new Date(resumo.proximoVencimento).toLocaleDateString('pt-BR')}` : 'Sem faturas pendentes'}`;

    const resultado = await sendWhatsAppMessage(numero, mensagem);
    return resultado !== null;
  } catch (error) {
    console.error('Erro ao enviar relatório financeiro:', error);
    return false;
  }
}
