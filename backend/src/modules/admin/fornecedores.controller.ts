import type { Request, Response } from 'express';
import { criarFornecedor, listarFornecedores, obterFornecedorPorId, atualizarFornecedor, deletarFornecedor } from './fornecedores.service.js';

export async function handleCriarFornecedor(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { nome, email, telefone, cnpj_cpf, categoria, endereco, cidade, estado, cep, condicoes_pagamento, dias_prazo, observacoes } = req.body;

    if (!nome) {
      res.status(400).json({ error: 'Nome do fornecedor é obrigatório' });
      return;
    }

    const fornecedor = await criarFornecedor(adminId, {
      nome,
      email,
      telefone,
      cnpj_cpf,
      categoria,
      endereco,
      cidade,
      estado,
      cep,
      condicoes_pagamento,
      dias_prazo: dias_prazo ? Number(dias_prazo) : undefined,
      observacoes,
    });

    res.status(201).json({ fornecedor, message: 'Fornecedor criado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar fornecedor';
    res.status(400).json({ error: message });
  }
}

export async function handleListarFornecedores(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const fornecedores = await listarFornecedores(adminId);
    res.status(200).json({ fornecedores });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar fornecedores';
    res.status(500).json({ error: message });
  }
}

export async function handleObterFornecedor(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { fornecedorId } = req.params;

    if (!fornecedorId) {
      res.status(400).json({ error: 'ID do fornecedor é obrigatório' });
      return;
    }

    const fornecedor = await obterFornecedorPorId(fornecedorId, adminId);

    if (!fornecedor) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    res.status(200).json({ fornecedor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter fornecedor';
    res.status(500).json({ error: message });
  }
}

export async function handleAtualizarFornecedor(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { fornecedorId } = req.params;

    if (!fornecedorId) {
      res.status(400).json({ error: 'ID do fornecedor é obrigatório' });
      return;
    }

    const fornecedor = await atualizarFornecedor(fornecedorId, adminId, req.body);

    if (!fornecedor) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    res.status(200).json({ fornecedor, message: 'Fornecedor atualizado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar fornecedor';
    res.status(400).json({ error: message });
  }
}

export async function handleDeletarFornecedor(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminUser?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const { fornecedorId } = req.params;

    if (!fornecedorId) {
      res.status(400).json({ error: 'ID do fornecedor é obrigatório' });
      return;
    }

    const deletado = await deletarFornecedor(fornecedorId, adminId);

    if (!deletado) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    res.status(200).json({ message: 'Fornecedor deletado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar fornecedor';
    res.status(400).json({ error: message });
  }
}
