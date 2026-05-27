import type { Request, Response } from 'express';
import {
  criarReceitaEsporadica,
  listarReceitasEsporadicas,
  obterReceitaEsporadicaPorId,
  atualizarReceitaEsporadica,
  marcarComoRecebida,
  deletarReceitaEsporadica,
} from './receitas-esporadicas.service.js';

export async function handleCriarReceitaEsporadica(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { cliente_id, descricao, valor, data_receita, tipo, observacoes } = req.body;

    if (!cliente_id || !descricao || !valor || !data_receita) {
      res.status(400).json({ error: 'Cliente, descrição, valor e data são obrigatórios' });
      return;
    }

    if (Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    const receita = await criarReceitaEsporadica(adminId, {
      cliente_id,
      descricao,
      valor: Number(valor),
      data_receita,
      tipo,
      observacoes,
    });

    res.status(201).json({ receita, message: 'Receita criada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar receita';
    res.status(400).json({ error: message });
  }
}

export async function handleListarReceitasEsporadicas(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { cliente_id, status } = req.query;

    const receitas = await listarReceitasEsporadicas(adminId, {
      cliente_id: cliente_id as string,
      status: status as string,
    });

    res.status(200).json({ receitas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar receitas';
    res.status(500).json({ error: message });
  }
}

export async function handleObterReceitaEsporadica(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { receitaId } = req.params;

    if (!receitaId) {
      res.status(400).json({ error: 'ID da receita é obrigatório' });
      return;
    }

    const receita = await obterReceitaEsporadicaPorId(receitaId, adminId);

    if (!receita) {
      res.status(404).json({ error: 'Receita não encontrada' });
      return;
    }

    res.status(200).json({ receita });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter receita';
    res.status(500).json({ error: message });
  }
}

export async function handleAtualizarReceitaEsporadica(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { receitaId } = req.params;

    if (!receitaId) {
      res.status(400).json({ error: 'ID da receita é obrigatório' });
      return;
    }

    if (req.body.valor && Number(req.body.valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser maior que zero' });
      return;
    }

    const receita = await atualizarReceitaEsporadica(receitaId, adminId, {
      ...req.body,
      valor: req.body.valor ? Number(req.body.valor) : undefined,
    });

    if (!receita) {
      res.status(404).json({ error: 'Receita não encontrada' });
      return;
    }

    res.status(200).json({ receita, message: 'Receita atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar receita';
    res.status(400).json({ error: message });
  }
}

export async function handleMarcarComoRecebida(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { receitaId } = req.params;

    if (!receitaId) {
      res.status(400).json({ error: 'ID da receita é obrigatório' });
      return;
    }

    const receita = await marcarComoRecebida(receitaId, adminId);

    if (!receita) {
      res.status(404).json({ error: 'Receita não encontrada' });
      return;
    }

    res.status(200).json({ receita, message: 'Receita marcada como recebida com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao marcar receita como recebida';
    res.status(400).json({ error: message });
  }
}

export async function handleDeletarReceitaEsporadica(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { receitaId } = req.params;

    if (!receitaId) {
      res.status(400).json({ error: 'ID da receita é obrigatório' });
      return;
    }

    const deletada = await deletarReceitaEsporadica(receitaId, adminId);

    if (!deletada) {
      res.status(404).json({ error: 'Receita não encontrada' });
      return;
    }

    res.status(200).json({ message: 'Receita deletada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar receita';
    res.status(400).json({ error: message });
  }
}
