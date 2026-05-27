import type { Request, Response } from 'express';
import { obterResumoFinanceiro } from './financeiro.service.js';

export async function handleObterResumoFinanceiro(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const resumo = await obterResumoFinanceiro(adminId);
    res.status(200).json({ resumo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter resumo financeiro';
    res.status(500).json({ error: message });
  }
}
