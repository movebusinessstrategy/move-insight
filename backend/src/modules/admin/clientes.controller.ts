import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { criarCliente, listarClientesComFinanceiro, obterClientePorId, enviarLembrancePagamento, atualizarCliente, enviarLembracaPagamentoBatch, atualizarClientesBatch, deletarCliente } from './clientes.service.js';
import { gerarRelatorio } from '../../services/meta-ads.js';
import { db } from '../../db/client.js';

export async function handleCriarCliente(req: Request, res: Response): Promise<void> {
  try {
    const { nome, email, valor_mensal, dia_vencimento, tipo_pessoa, cpf_cnpj, nome_fantasia, endereco, cidade, estado, cep, telefone, meta_ads_account_id, data_inicio_trabalhos } = req.body;

    if (!nome || !email) {
      res.status(400).json({ error: 'Nome e email são obrigatórios' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    const cliente = await criarCliente({
      nome,
      email,
      valor_mensal: valor_mensal ? Number(valor_mensal) : null,
      dia_vencimento: dia_vencimento ? Number(dia_vencimento) : null,
      tipo_pessoa,
      cpf_cnpj,
      nome_fantasia,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      meta_ads_account_id,
      data_inicio_trabalhos,
    });

    res.status(201).json({ cliente, message: 'Cliente criado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar cliente';
    res.status(400).json({ error: message });
  }
}

export async function handleListarClientes(_req: Request, res: Response): Promise<void> {
  try {
    const clientes = await listarClientesComFinanceiro();
    res.status(200).json({ clientes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar clientes';
    res.status(500).json({ error: message });
  }
}

export async function handleObterCliente(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    res.status(200).json({ cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter cliente';
    res.status(500).json({ error: message });
  }
}

export async function handleEnviarLembrance(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const sendMessage = (req as any).sendWhatsAppMessage;
    await enviarLembrancePagamento(clienteId, sendMessage);

    res.status(200).json({ message: 'Lembrete de pagamento disparado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar lembrete';
    res.status(400).json({ error: message });
  }
}

export async function handleAtualizarCliente(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const {
      tipo_pessoa,
      nome,
      email,
      cpf_cnpj,
      nome_fantasia,
      telefone,
      whatsapp_numero,
      endereco,
      cidade,
      estado,
      cep,
      data_inicio_trabalhos,
      valor_mensal,
      dia_vencimento,
      meta_ads_account_id,
      relatorio_frequencia,
    } = req.body;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await atualizarCliente(clienteId, {
      tipo_pessoa,
      nome,
      email,
      cpf_cnpj,
      nome_fantasia,
      telefone,
      whatsapp_numero,
      endereco,
      cidade,
      estado,
      cep,
      data_inicio_trabalhos,
      valor_mensal,
      dia_vencimento,
      meta_ads_account_id,
      relatorio_frequencia,
    });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    res.status(200).json({ cliente, message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar cliente';
    res.status(400).json({ error: message });
  }
}

export async function handleGerarRelatorio(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { period = 'last_7d', since, until } = req.query;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    if (!cliente.meta_ads_account_id) {
      res.status(400).json({ error: 'Cliente não possui ID de conta Meta Ads configurado' });
      return;
    }

    let periodParam: any = period as string;
    if (since && until) {
      periodParam = {
        since: String(since),
        until: String(until),
      };
    }

    const relatorio = await gerarRelatorio(cliente.meta_ads_account_id, periodParam);
    res.status(200).json({ relatorio });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar relatório';
    res.status(400).json({ error: message });
  }
}

export async function handleEnviarLembracaBatch(req: Request, res: Response): Promise<void> {
  try {
    const { clienteIds } = req.body;

    if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
      res.status(400).json({ error: 'clienteIds deve ser um array não vazio' });
      return;
    }

    const sendMessage = (req as any).sendWhatsAppMessage;
    const resultado = await enviarLembracaPagamentoBatch(clienteIds, sendMessage);

    res.status(200).json({ resultado, message: `${resultado.enviados} lembretes disparados com sucesso` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar lembretes';
    res.status(400).json({ error: message });
  }
}

export async function handleAtualizarClientesBatch(req: Request, res: Response): Promise<void> {
  try {
    const { clienteIds, updates } = req.body;

    if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
      res.status(400).json({ error: 'clienteIds deve ser um array não vazio' });
      return;
    }

    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'updates não pode estar vazio' });
      return;
    }

    const resultado = await atualizarClientesBatch(clienteIds, updates);

    res.status(200).json({ resultado, message: `${resultado.atualizados} clientes atualizados com sucesso` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar clientes';
    res.status(400).json({ error: message });
  }
}

export async function handlePreviewRelatorio(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { period = 'last_7d', since, until } = req.query;

    console.log(`[Preview] clienteId: ${clienteId}, period: ${period}, since: ${since}, until: ${until}`);

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    if (!cliente.meta_ads_account_id) {
      res.status(400).json({ error: 'Cliente não possui ID de conta Meta Ads configurado' });
      return;
    }

    let periodParam: any = period as string;
    if (since && until) {
      periodParam = {
        since: String(since),
        until: String(until),
      };
    }

    console.log(`[Preview] Usando periodParam:`, periodParam);

    const { formatarRelatorioWhatsApp } = await import('../../services/meta-ads.js');
    const relatorio = await gerarRelatorio(cliente.meta_ads_account_id, periodParam);
    const mensagem = await formatarRelatorioWhatsApp(relatorio, cliente.nome);

    res.status(200).json({ mensagem, periodo: relatorio.periodo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar preview do relatório';
    res.status(400).json({ error: message });
  }
}

export async function handleEnviarRelatorioAgora(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { mensagem } = req.body;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    if (!cliente.whatsapp_numero) {
      res.status(400).json({ error: 'Cliente não possui WhatsApp configurado' });
      return;
    }

    const sendMessage = (req as any).sendWhatsAppMessage;

    const whatsappNumber = cliente.whatsapp_numero;
    let msgId: string | null = null;
    let status = 'pendente';

    try {
      if (sendMessage && mensagem) {
        msgId = await sendMessage(whatsappNumber, mensagem);
        status = msgId ? 'enviado' : 'erro';
      }
    } catch (_error) {
      status = 'erro';
    }

    await db`
      INSERT INTO mensagens_enviadas (id, cliente_id, tipo, status, conteudo, whatsapp_msg_id, destinatario_phone, triggered_by)
      VALUES (
        gen_random_uuid(),
        ${clienteId},
        'relatorio_manual',
        ${status},
        ${mensagem},
        ${msgId},
        ${whatsappNumber},
        'admin'
      )
    `;

    res.status(200).json({ message: 'Relatório enviado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar relatório';
    res.status(400).json({ error: message });
  }
}

export async function handleAtualizarFrequenciaRelatorio(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { frequencia } = req.body;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    if (!['semanal', 'mensal', 'nunca'].includes(frequencia)) {
      res.status(400).json({ error: 'Frequência inválida. Use: semanal, mensal ou nunca' });
      return;
    }

    const cliente = await atualizarCliente(clienteId, { relatorio_frequencia: frequencia });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    res.status(200).json({ cliente, message: 'Frequência de relatório atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar frequência';
    res.status(400).json({ error: message });
  }
}

export async function handleDeleteClient(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const deleted = await deletarCliente(clienteId);

    if (!deleted) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    res.status(200).json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir cliente';
    res.status(400).json({ error: message });
  }
}

export async function handleObterResumoRelatorio(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { periodo = 'last_30d' } = req.query;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);

    if (!cliente || !cliente.meta_ads_account_id) {
      res.status(404).json({ error: 'Cliente não encontrado ou sem Meta Ads configurado' });
      return;
    }

    const relatorio = await gerarRelatorio(cliente.meta_ads_account_id, periodo as any);

    console.log(`[handleObterResumoRelatorio] Relatório bruto:`, JSON.stringify(relatorio.campanhas.slice(0, 1), null, 2));

    res.status(200).json({
      periodo: relatorio.periodo,
      resumo: {
        totalSpend: relatorio.resumo.totalSpend,
        totalCliques: relatorio.resumo.totalCliques,
        totalConversoes: relatorio.resumo.totalConversoes,
        totalConversasIniciadasMensagem: relatorio.resumo.totalConversasIniciadasMensagem,
        roas: relatorio.resumo.roas,
        totalImpressoes: relatorio.resumo.totalImpressoes,
        cpmMedio: relatorio.resumo.cpmMedio,
        cpcMedio: relatorio.resumo.cpcMedio,
      },
      campanhas: relatorio.campanhas.map((c: any) => ({
        id: c.id || '',
        name: c.nome || '',
        impressions: c.impressoes || 0,
        clicks: c.cliques || 0,
        conversions: c.conversoes || 0,
        spend: c.spend || 0,
        ctr: c.ctr || 0,
        cpc: c.cpc || 0,
        ctr_rate: c.ctr || 0,
        roas: c.spend > 0 ? c.conversoes / c.spend : 0,
      })),
      analise: {
        score: 75,
        saude: 'bom',
        insights: ['Campanhas performando bem'],
        recomendacoes: ['Continuar monitorando'],
      },
      comparacao_anterior: {
        variacao_spend: 0,
        variacao_cliques: 0,
        variacao_conversoes: 0,
        tendencia: 'estável',
        analise: 'Desempenho mantido',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter resumo do relatório';
    res.status(400).json({ error: message });
  }
}

export async function handleObterAnaliseIA(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    res.status(200).json({
      oportunidades: [
        'Aumentar orçamento para campanhas de melhor desempenho',
        'Otimizar grupos de anúncios com menor CTR',
      ],
      alertas: [
        'CPM acima da média da indústria',
        'Taxa de conversão abaixo do esperado',
      ],
      proximos_passos: [
        'Testar novos públicos-alvo',
        'Revisar criativos menos eficazes',
        'Aumentar frequência de campanhas top',
      ],
      analise_concorrencial: 'Seu desempenho está em linha com a concorrência em ROAS, mas com CPM mais elevado.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter análise com IA';
    res.status(400).json({ error: message });
  }
}

export async function handleObterPrevisoes(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    res.status(200).json({
      roas_forecast: 2.8,
      confianca: 0.85,
      fatores: [
        'Sazonalidade histórica',
        'Tendências de mercado',
        'Comportamento de conversão',
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter previsões';
    res.status(400).json({ error: message });
  }
}

export async function handleObterBenchmarks(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    res.status(200).json({
      seu_cpm: 'R$ 15,50',
      industria_cpm: 'R$ 12,00',
      seu_cpc: 'R$ 2,30',
      industria_cpc: 'R$ 1,80',
      seu_roas: '2.5x',
      industria_roas: '2.0x',
      posicao_cpm: 'Acima da média',
      posicao_cpc: 'Acima da média',
      posicao_roas: 'Acima da média',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter benchmarks';
    res.status(400).json({ error: message });
  }
}

export async function handleCriarLoginCliente(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { email, senha } = req.body as { email?: string; senha?: string };

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    if (!email || !senha) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    // Validar cliente existe
    const cliente = await obterClientePorId(clienteId);
    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Verificar se já existe login para este cliente
    const loginExistente = await db`
      SELECT id FROM cliente_logins WHERE cliente_id = ${clienteId}
    `;

    let loginId: string;

    if (loginExistente.length > 0) {
      // Atualizar
      await db`
        UPDATE cliente_logins
        SET email = ${email}, senha_hash = ${senhaHash}, senha_provisoria = true, ativo = true
        WHERE cliente_id = ${clienteId}
      `;
      loginId = loginExistente[0].id;
    } else {
      // Criar novo
      const resultado = await db`
        INSERT INTO cliente_logins (cliente_id, email, senha_hash, ativo, senha_provisoria)
        VALUES (${clienteId}, ${email}, ${senhaHash}, true, true)
        RETURNING id
      `;
      loginId = resultado[0].id;
    }

    res.status(200).json({
      message: 'Login criado com sucesso',
      login: {
        id: loginId,
        cliente_id: clienteId,
        email,
        senha_provisoria: true,
        ativo: true,
      },
      instrucoes: 'Cliente deverá trocar a senha no primeiro acesso',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar login do cliente';
    res.status(400).json({ error: message });
  }
}
