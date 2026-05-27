import type { Request, Response } from 'express';
import { obterClientePorId } from '../admin/clientes.service.js';
import { obterContasMetaAds } from '../../services/meta-ads.js';
import {
  analisarDesempenhoCampanha,
  compararPerodos,
  gerarInsightsDeCampanha,
  previsaoROAS,
  calcularBenchmarks,
} from '../../services/ia-analise.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function handleObterResumoRelatorio(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clienteId = req.params.clienteId || (req.user as any)?.clienteId;
    if (!clienteId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);
    if (!cliente || !cliente.meta_ads_account_id) {
      res.status(404).json({ error: 'Cliente ou conta Meta Ads não encontrada' });
      return;
    }

    const { periodo = 'last_30d', dataInicio, dataFim } = req.query;

    let dataInicial = new Date();
    let dataFinal = new Date();

    if (dataInicio && dataFim) {
      dataInicial = new Date(String(dataInicio));
      dataFinal = new Date(String(dataFim));
    } else {
      switch (periodo) {
        case 'last_7d':
          dataInicial.setDate(dataFinal.getDate() - 7);
          break;
        case 'last_90d':
          dataInicial.setDate(dataFinal.getDate() - 90);
          break;
        case 'last_30d':
        default:
          dataInicial.setDate(dataFinal.getDate() - 30);
      }
    }

    // Buscar dados Meta Ads para o período
    const contasAtual = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicial, dataFinal);

    // Buscar dados período anterior (mesma duração)
    const duracao = Math.floor((dataFinal.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24));
    const dataInicialAnterior = new Date(dataInicial);
    dataInicialAnterior.setDate(dataInicialAnterior.getDate() - duracao);
    const contasAnterior = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicialAnterior, dataInicial);

    // Análise de desempenho
    const analiseDesempenho = await analisarDesempenhoCampanha(contasAtual);

    // Comparação com período anterior
    const comparacao = await compararPerodos(contasAnterior, contasAtual);

    // Totais
    const totalSpend = contasAtual.reduce((sum: number, c) => sum + c.spend, 0);
    const totalCliques = contasAtual.reduce((sum: number, c) => sum + c.clicks, 0);
    const totalConversoes = contasAtual.reduce((sum: number, c) => sum + c.conversions, 0);
    const mediaRoas = contasAtual.length > 0 ? contasAtual.reduce((sum: number, c) => sum + c.roas, 0) / contasAtual.length : 0;

    res.status(200).json({
      periodo: {
        inicio: dataInicial.toISOString().split('T')[0],
        fim: dataFinal.toISOString().split('T')[0],
      },
      resumo: {
        spend: parseFloat(totalSpend.toFixed(2)),
        cliques: totalCliques,
        conversoes: totalConversoes,
        roas: parseFloat(mediaRoas.toFixed(2)),
      },
      analise: analiseDesempenho,
      comparacao_anterior: comparacao,
      campanhas: contasAtual.slice(0, 5), // Top 5
    });
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ error: 'Erro ao processar relatório' });
  }
}

export async function handleObterAnaliseIA(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clienteId = req.params.clienteId || (req.user as any)?.clienteId;
    if (!clienteId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);
    if (!cliente || !cliente.meta_ads_account_id) {
      res.status(404).json({ error: 'Cliente ou conta Meta Ads não encontrada' });
      return;
    }

    const dataFinal = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(dataFinal.getDate() - 30);

    const contas = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicial, dataFinal);

    if (contas.length === 0) {
      res.status(200).json({
        oportunidades: ['Sem dados disponíveis para análise'],
        alertas: ['Nenhuma campanha ativa no período'],
        proximos_passos: ['Crie ou ative campanhas para análise'],
        analise_concorrencial: 'Análise não disponível',
      });
      return;
    }

    // Gerar insights para principal campanha
    const campanhaPrincipal = contas.sort((a: any, b: any) => b.spend - a.spend)[0];
    const insights = await gerarInsightsDeCampanha(campanhaPrincipal);

    res.status(200).json(insights);
  } catch (error) {
    console.error('Erro ao obter análise IA:', error);
    res.status(500).json({ error: 'Erro ao processar análise' });
  }
}

export async function handleObterPrevisoes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clienteId = req.params.clienteId || (req.user as any)?.clienteId;
    if (!clienteId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);
    if (!cliente || !cliente.meta_ads_account_id) {
      res.status(404).json({ error: 'Cliente ou conta Meta Ads não encontrada' });
      return;
    }

    const dataFinal = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(dataFinal.getDate() - 30);

    const historico = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicial, dataFinal);

    if (historico.length === 0) {
      res.status(200).json({
        roas_forecast: 2.0,
        cpa_forecast: 0,
        efficiency_trend: [],
      });
      return;
    }

    const previsao = await previsaoROAS(historico);

    res.status(200).json({
      roas_forecast: previsao.roas_previsto,
      confianca: previsao.confianca,
      fatores: previsao.fatores,
    });
  } catch (error) {
    console.error('Erro ao obter previsões:', error);
    res.status(500).json({ error: 'Erro ao processar previsões' });
  }
}

export async function handleObterBenchmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clienteId = req.params.clienteId || (req.user as any)?.clienteId;
    if (!clienteId) {
      res.status(401).json({ error: 'Cliente não autenticado' });
      return;
    }

    const cliente = await obterClientePorId(clienteId);
    if (!cliente || !cliente.meta_ads_account_id) {
      res.status(404).json({ error: 'Cliente ou conta Meta Ads não encontrada' });
      return;
    }

    const dataFinal = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(dataFinal.getDate() - 30);

    const dados = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicial, dataFinal);

    if (dados.length === 0) {
      res.status(200).json({
        seu_cpm: '0.00',
        industria_cpm: '15.00',
        seu_cpc: '0.00',
        industria_cpc: '2.50',
        seu_roas: '0.00',
        industria_roas: '2.00',
        posicao_cpm: 'melhor',
        posicao_cpc: 'melhor',
        posicao_roas: 'pior',
      });
      return;
    }

    const benchmarks = await calcularBenchmarks(dados);

    res.status(200).json(benchmarks);
  } catch (error) {
    console.error('Erro ao obter benchmarks:', error);
    res.status(500).json({ error: 'Erro ao processar benchmarks' });
  }
}
