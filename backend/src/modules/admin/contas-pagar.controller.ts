import type { Request, Response } from 'express';
import {
  criarContaPagar,
  listarContasPagar,
  obterContaPagarPorId,
  listarContasAtrasadas,
  atualizarContaPagar,
  marcarComoPago,
  deletarContaPagar,
} from './contas-pagar.service.js';

export async function handleCriarContaPagar(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { fornecedor_id, descricao, valor, data_vencimento, categoria, observacoes } = req.body;

    if (!fornecedor_id || !descricao || !valor || !data_vencimento) {
      res.status(400).json({ error: 'Fornecedor, descrição, valor e data de vencimento são obrigatórios' });
      return;
    }

    if (Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    const conta = await criarContaPagar(adminId, {
      fornecedor_id,
      descricao,
      valor: Number(valor),
      data_vencimento,
      categoria,
      observacoes,
    });

    res.status(201).json({ conta, message: 'Conta a pagar criada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar conta a pagar';
    res.status(400).json({ error: message });
  }
}

export async function handleListarContasPagar(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { status, fornecedor_id } = req.query;

    const contas = await listarContasPagar(adminId, {
      status: status as string,
      fornecedor_id: fornecedor_id as string,
    });

    res.status(200).json({ contas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar contas a pagar';
    res.status(500).json({ error: message });
  }
}

export async function handleListarContasAtrasadas(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const contas = await listarContasAtrasadas(adminId);
    res.status(200).json({ contas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar contas atrasadas';
    res.status(500).json({ error: message });
  }
}

export async function handleObterContaPagar(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { contaId } = req.params;

    if (!contaId) {
      res.status(400).json({ error: 'ID da conta é obrigatório' });
      return;
    }

    const conta = await obterContaPagarPorId(contaId, adminId);

    if (!conta) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    res.status(200).json({ conta });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter conta a pagar';
    res.status(500).json({ error: message });
  }
}

export async function handleAtualizarContaPagar(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { contaId } = req.params;

    if (!contaId) {
      res.status(400).json({ error: 'ID da conta é obrigatório' });
      return;
    }

    if (req.body.valor && Number(req.body.valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    const conta = await atualizarContaPagar(contaId, adminId, {
      ...req.body,
      valor: req.body.valor ? Number(req.body.valor) : undefined,
    });

    if (!conta) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    res.status(200).json({ conta, message: 'Conta atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar conta a pagar';
    res.status(400).json({ error: message });
  }
}

export async function handleMarcarComoPago(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { contaId } = req.params;

    if (!contaId) {
      res.status(400).json({ error: 'ID da conta é obrigatório' });
      return;
    }

    const conta = await marcarComoPago(contaId, adminId);

    if (!conta) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    res.status(200).json({ conta, message: 'Conta marcada como paga com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao marcar conta como paga';
    res.status(400).json({ error: message });
  }
}

export async function handleDeletarContaPagar(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { contaId } = req.params;

    if (!contaId) {
      res.status(400).json({ error: 'ID da conta é obrigatório' });
      return;
    }

    const deletada = await deletarContaPagar(contaId, adminId);

    if (!deletada) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    res.status(200).json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar conta a pagar';
    res.status(400).json({ error: message });
  }
}
