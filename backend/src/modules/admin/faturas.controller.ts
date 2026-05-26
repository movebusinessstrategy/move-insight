import type { Request, Response } from 'express';
import {
  listarFaturas,
  registrarPagamento,
  obterResumoFinanceiro,
  obterFaturamentoMensal,
  enviarReminderFatura,
  enviarRelatorioFinanceiro,
} from './faturas.service.js';

export async function handleListarFaturas(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const faturas = await listarFaturas(clienteId);
    res.status(200).json({ faturas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar faturas';
    res.status(500).json({ error: message });
  }
}

export async function handleRegistrarPagamento(req: Request, res: Response): Promise<void> {
  try {
    const { faturaId } = req.params;
    const { observacoes } = req.body;

    if (!faturaId) {
      res.status(400).json({ error: 'ID da fatura é obrigatório' });
      return;
    }

    const fatura = await registrarPagamento(faturaId, observacoes);

    if (!fatura) {
      res.status(404).json({ error: 'Fatura não encontrada' });
      return;
    }

    res.status(200).json({ fatura, message: 'Pagamento registrado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar pagamento';
    res.status(400).json({ error: message });
  }
}

export async function handleObterResumoFinanceiro(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const resumo = await obterResumoFinanceiro(clienteId);
    res.status(200).json({ resumo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter resumo financeiro';
    res.status(500).json({ error: message });
  }
}

export async function handleObterFaturamentoMensal(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;

    if (!clienteId) {
      res.status(400).json({ error: 'ID do cliente é obrigatório' });
      return;
    }

    const faturamento = await obterFaturamentoMensal(clienteId);
    res.status(200).json({ faturamento });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter faturamento mensal';
    res.status(500).json({ error: message });
  }
}

export async function handleEnviarReminderFatura(req: Request, res: Response): Promise<void> {
  try {
    const { faturaId } = req.params;
    const { numero } = req.body;

    if (!faturaId || !numero) {
      res.status(400).json({ error: 'ID da fatura e número WhatsApp são obrigatórios' });
      return;
    }

    const sucesso = await enviarReminderFatura(faturaId, numero);

    if (!sucesso) {
      res.status(500).json({ error: 'Erro ao enviar mensagem WhatsApp' });
      return;
    }

    res.status(200).json({ message: 'Reminder enviado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar reminder';
    res.status(500).json({ error: message });
  }
}

export async function handleEnviarRelatorioFinanceiro(req: Request, res: Response): Promise<void> {
  try {
    const { clienteId } = req.params;
    const { numero } = req.body;

    if (!clienteId || !numero) {
      res.status(400).json({ error: 'ID do cliente e número WhatsApp são obrigatórios' });
      return;
    }

    const sucesso = await enviarRelatorioFinanceiro(clienteId, numero);

    if (!sucesso) {
      res.status(500).json({ error: 'Erro ao enviar mensagem WhatsApp' });
      return;
    }

    res.status(200).json({ message: 'Relatório enviado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao enviar relatório';
    res.status(500).json({ error: message });
  }
}
