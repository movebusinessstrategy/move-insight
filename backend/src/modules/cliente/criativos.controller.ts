import type { Request, Response } from 'express';
import { gerarSugestoesCreativas, obterHistoricoSugestoes, deletarSugestao } from './criativos.service.js';
import { obterContextoCliente } from './contexto.service.js';

type TipoSugestao = 'post_instagram' | 'copy_whatsapp' | 'titulo_anuncio' | 'angulo_venda' | 'geral';

const isTipoSugestaoValido = (valor: string): valor is TipoSugestao => {
  return ['post_instagram', 'copy_whatsapp', 'titulo_anuncio', 'angulo_venda', 'geral'].includes(valor);
};

/**
 * POST /cliente/criativos/gerar
 * Generate creative suggestions for authenticated client
 */
export async function handleGerarSugestoes(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    let { tipo = 'geral' } = req.body as { tipo?: string };

    const tipoValido = isTipoSugestaoValido(tipo) ? tipo : 'geral';

    // Fetch client context
    const contexto = await obterContextoCliente(clienteUser.cliente_id);

    // Check if context has minimal info
    if (!contexto.descricao_empresa && !contexto.produtos_servicos) {
      res.status(400).json({
        error: 'Complete o contexto da sua empresa primeiro (descrição e produtos/serviços)',
      });
      return;
    }

    // Generate suggestions
    const resposta = await gerarSugestoesCreativas(clienteUser.cliente_id, contexto, tipoValido);

    res.status(200).json({
      tipo: tipoValido,
      sugestoes: resposta,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar sugestões';
    console.error('Erro ao gerar sugestões:', error);
    res.status(400).json({ error: message });
  }
}

/**
 * GET /cliente/criativos/historico
 * Get suggestion history for authenticated client
 */
export async function handleObterHistorico(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    const { limite = '10' } = req.query as { limite?: string };
    const limiteNum = Math.min(parseInt(limite) || 10, 50);

    const historico = await obterHistoricoSugestoes(clienteUser.cliente_id, limiteNum);

    res.status(200).json({ historico, total: historico.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar histórico';
    res.status(400).json({ error: message });
  }
}

/**
 * DELETE /cliente/criativos/:sugestaoId
 * Delete suggestion from history
 */
export async function handleDeletarSugestao(req: Request, res: Response): Promise<void> {
  try {
    const clienteUser = (req as any).clienteUser;
    const { sugestaoId } = req.params;

    if (!clienteUser) {
      res.status(401).json({ error: 'Autenticação necessária' });
      return;
    }

    if (!sugestaoId) {
      res.status(400).json({ error: 'ID da sugestão é obrigatório' });
      return;
    }

    await deletarSugestao(sugestaoId, clienteUser.cliente_id);

    res.status(200).json({ message: 'Sugestão removida com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao remover sugestão';
    res.status(400).json({ error: message });
  }
}
