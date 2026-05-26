import type { Request, Response } from 'express';
import { criarCliente, listarClientesComFinanceiro, obterClientePorId, enviarLembrancePagamento, atualizarCliente } from './clientes.service.js';
import { gerarRelatorio } from '../../services/meta-ads.js';

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
