import type { Request, Response } from 'express';
import { listarClientesComFinanceiro, obterClientePorId, enviarLembrancePagamento } from './clientes.service.js';

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
