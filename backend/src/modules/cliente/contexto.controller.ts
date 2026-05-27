import type { Request, Response } from 'express';
import { obterContextoCliente, atualizarContextoCliente } from './contexto.service.js';

/**
 * GET /cliente/contexto
 * Returns context data for authenticated client
 */
export async function handleObterContextoCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const contexto = await obterContextoCliente(clienteUser.cliente_id);

    res.status(200).json(contexto);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar contexto';
    res.status(400).json({ error: message });
  }
}

/**
 * PUT /cliente/contexto
 * Updates context data for authenticated client
 */
export async function handleAtualizarContextoCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const { descricao_empresa, produtos_servicos, localizacao, estrategia, tom_marca, publico_alvo } = req.body;

    const contexto = await atualizarContextoCliente(clienteUser.cliente_id, {
      descricao_empresa,
      produtos_servicos,
      localizacao,
      estrategia,
      tom_marca,
      publico_alvo,
    });

    res.status(200).json({ message: 'Contexto atualizado com sucesso', contexto });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar contexto';
    res.status(400).json({ error: message });
  }
}
