import type { Request, Response } from 'express';
import { obterDashboardCliente, obterComparativoCliente, obterTendenciasCliente } from './dashboard.service.js';

type DatePreset = 'last_7d' | 'last_30d' | 'last_90d';

const isValidDatePreset = (value: string): value is DatePreset => {
  return ['last_7d', 'last_30d', 'last_90d'].includes(value);
};

/**
 * GET /cliente/dashboard/resumo
 * Returns summary dashboard data for authenticated client
 */
export async function handleObterResumoCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    let { periodo = 'last_7d' } = req.query as { periodo?: string };

    const validPeriodo = isValidDatePreset(periodo) ? periodo : 'last_7d';

    const dashboard = await obterDashboardCliente(clienteUser.cliente_id, validPeriodo);

    res.status(200).json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar dados do dashboard';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /cliente/dashboard/campanhas
 * Returns list of campaigns with data for authenticated client
 */
export async function handleListarCampanhasCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    let { periodo = 'last_7d' } = req.query as { periodo?: string };

    const validPeriodo = isValidDatePreset(periodo) ? periodo : 'last_7d';

    const dashboard = await obterDashboardCliente(clienteUser.cliente_id, validPeriodo);

    res.status(200).json({
      campanhas: dashboard.campanhas,
      total: dashboard.campanhas.length,
      resumo: {
        totalSpend: dashboard.resumo.totalSpend,
        totalCliques: dashboard.resumo.totalCliques,
        totalConversas: dashboard.resumo.totalConversasIniciadasMensagem,
      },
      periodo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar campanhas';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /cliente/dashboard/comparativo
 * Returns comparison between periods
 */
export async function handleObterComparativoCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    let { periodo1 = 'last_7d', periodo2 = 'last_7d' } = req.query as {
      periodo1?: string;
      periodo2?: string;
    };

    const validPeriodo1 = isValidDatePreset(periodo1) ? periodo1 : 'last_7d';
    const validPeriodo2 = isValidDatePreset(periodo2) ? periodo2 : 'last_7d';

    const comparativo = await obterComparativoCliente(clienteUser.cliente_id, validPeriodo1, validPeriodo2);

    res.status(200).json(comparativo);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar comparativo';
    res.status(400).json({ error: message });
  }
}

/**
 * GET /cliente/dashboard/tendencias
 * Returns trends data for a specific metric
 */
export async function handleObterTendenciasCliente(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    let { metrica = 'spend', periodo = 'last_30d' } = req.query as {
      metrica?: 'spend' | 'cliques' | 'conversas';
      periodo?: string;
    };

    if (!['spend', 'cliques', 'conversas'].includes(metrica)) {
      res.status(400).json({ error: 'Métrica inválida. Use: spend, cliques ou conversas' });
      return;
    }

    const validPeriodo = isValidDatePreset(periodo) ? periodo : 'last_30d';

    const tendencias = await obterTendenciasCliente(clienteUser.cliente_id, metrica, validPeriodo);

    res.status(200).json(tendencias);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar tendências';
    res.status(400).json({ error: message });
  }
}
