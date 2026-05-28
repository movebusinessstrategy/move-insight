import type { Request, Response } from 'express';
import { obterResumoCliente, obterCampanhasCliente } from './dashboard.service.js';

export async function handleObterResumoCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;
    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const { periodo = 'last_30d' } = req.query as { periodo?: string };

    const resumo = await obterResumoCliente(clienteUser.cliente_id, periodo);

    res.status(200).json(resumo);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter resumo';
    res.status(400).json({ error: message });
  }
}

export async function handleObterCampanhasCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;
    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const { periodo = 'last_30d' } = req.query as { periodo?: string };

    const campanhas = await obterCampanhasCliente(clienteUser.cliente_id, periodo);

    res.status(200).json({ campanhas });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter campanhas';
    res.status(400).json({ error: message });
  }
}
