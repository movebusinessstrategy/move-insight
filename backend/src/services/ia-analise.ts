interface CampanhaDados {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  ctr_rate: number;
  roas: number;
  totalConversasIniciadasMensagem?: number;
  taxaMensagensIniciadasPorClique?: number;
}

interface AnaliseDesempenho {
  score: number;
  saude: 'excelente' | 'bom' | 'regular' | 'crítico';
  insights: string[];
  recomendacoes: string[];
}

interface ComparacaoPeridos {
  variacao_spend: number;
  variacao_cliques: number;
  variacao_conversoes: number;
  tendencia: 'crescimento' | 'queda' | 'estável';
  analise: string;
}

interface InsightsCampanha {
  oportunidades: string[];
  alertas: string[];
  proximos_passos: string[];
  analise_concorrencial: string;
}

interface PrevisaoROAS {
  roas_previsto: number;
  confianca: number;
  fatores: string[];
}

async function chamarClaudeAPI(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    return data.content[0].text;
  } catch (error) {
    console.error('Erro ao chamar Claude API:', error);
    throw error;
  }
}

export async function analisarDesempenhoCampanha(
  dados_campanha: CampanhaDados[],
): Promise<AnaliseDesempenho> {
  const totalMensagens = dados_campanha.reduce((sum, c) => sum + (c.totalConversasIniciadasMensagem || 0), 0);
  const totalCliques = dados_campanha.reduce((sum, c) => sum + c.clicks, 0);
  const taxaMensagensGlobal = totalCliques > 0 ? (totalMensagens / totalCliques) * 100 : 0;

  const prompt = `Analise este desempenho de Meta Ads com foco na métrica de MENSAGENS INICIADAS (não conversões diretas).

A estratégia é: trazer tráfego qualificado para Instagram → depois converter em mensagens WhatsApp → depois vender.

Dados das campanhas:
${JSON.stringify(dados_campanha, null, 2)}

Métricas agregadas:
- Total de Mensagens Iniciadas: ${totalMensagens}
- Total de Cliques: ${totalCliques}
- Taxa de Mensagens por Clique: ${taxaMensagensGlobal.toFixed(2)}%

Retorne APENAS um JSON válido com esta estrutura (sem markdown):
{
  "score": número entre 0-100,
  "saude": "excelente" | "bom" | "regular" | "crítico",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recomendacoes": ["recom 1", "recom 2", "recom 3"]
}

Considere ao analisar (em ordem de importância):
1. Taxa de Mensagens Iniciadas por Clique (bom >= 3-5%)
2. CTR (indica atração de tráfego, bom >= 2%)
3. CPC (quanto menor melhor para atrair mais cliques)
4. Volume total de mensagens (quanto mais, melhor o funil está funcionando)
5. ROAS baseado em LTV do cliente / Spend (considerando que nem todas as mensagens se convertem)`;

  try {
    const resposta = await chamarClaudeAPI(prompt);
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro na análise de desempenho:', error);
    return {
      score: 50,
      saude: 'regular',
      insights: ['Erro ao processar análise. Tente novamente.'],
      recomendacoes: ['Verifique os dados da campanha e tente novamente.'],
    };
  }
}

export async function compararPerodos(
  dados_anterior: CampanhaDados[],
  dados_atual: CampanhaDados[],
): Promise<ComparacaoPeridos> {
  const totalAnterior = dados_anterior.reduce((sum, c) => sum + c.spend, 0);
  const totalAtual = dados_atual.reduce((sum, c) => sum + c.spend, 0);
  const variacao_spend = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

  const cliquesAnterior = dados_anterior.reduce((sum, c) => sum + c.clicks, 0);
  const cliquesAtual = dados_atual.reduce((sum, c) => sum + c.clicks, 0);
  const variacao_cliques = cliquesAnterior > 0 ? ((cliquesAtual - cliquesAnterior) / cliquesAnterior) * 100 : 0;

  const mensagensAnterior = dados_anterior.reduce((sum, c) => sum + (c.totalConversasIniciadasMensagem || 0), 0);
  const mensagensAtual = dados_atual.reduce((sum, c) => sum + (c.totalConversasIniciadasMensagem || 0), 0);
  const variacao_conversoes = mensagensAnterior > 0 ? ((mensagensAtual - mensagensAnterior) / mensagensAnterior) * 100 : 0;

  let tendencia: 'crescimento' | 'queda' | 'estável' = 'estável';
  if (variacao_conversoes > 5) tendencia = 'crescimento';
  else if (variacao_conversoes < -5) tendencia = 'queda';

  const prompt = `Baseado nesta comparação de períodos (métrica: Mensagens Iniciadas no WhatsApp), faça uma análise:

  Variação de Spend: ${variacao_spend.toFixed(1)}%
  Variação de Cliques: ${variacao_cliques.toFixed(1)}%
  Variação de Mensagens Iniciadas: ${variacao_conversoes.toFixed(1)}%
  Tendência: ${tendencia}

  Forneça uma análise concisa sobre o desempenho do funil: anúncio → tráfego → mensagens. (máx 150 caracteres)`;

  try {
    const analise = await chamarClaudeAPI(prompt);
    return {
      variacao_spend,
      variacao_cliques,
      variacao_conversoes,
      tendencia,
      analise,
    };
  } catch (error) {
    console.error('Erro na comparação de períodos:', error);
    return {
      variacao_spend,
      variacao_cliques,
      variacao_conversoes,
      tendencia,
      analise: 'Análise indisponível no momento.',
    };
  }
}

export async function gerarInsightsDeCampanha(campanha: CampanhaDados): Promise<InsightsCampanha> {
  const taxaMensagensPercentual = campanha.clicks > 0 ? ((campanha.totalConversasIniciadasMensagem || 0) / campanha.clicks) * 100 : 0;

  const prompt = `Analise esta campanha Meta Ads com FOCO NA MÉTRICA DE MENSAGENS INICIADAS (sucesso = mais mensagens, não conversões diretas):

Campanha: ${campanha.name}
Impressões: ${campanha.impressions}
Cliques: ${campanha.clicks}
Mensagens Iniciadas (WhatsApp): ${campanha.totalConversasIniciadasMensagem || 0}
Taxa de Mensagens por Clique: ${taxaMensagensPercentual.toFixed(2)}%
Spend: R$ ${campanha.spend.toFixed(2)}
CTR: ${campanha.ctr_rate.toFixed(2)}%
CPC: R$ ${campanha.cpc.toFixed(2)}
ROAS: ${campanha.roas.toFixed(2)}x

O funil é: Anúncio → Clique (tráfego) → Instagram/Website → Mensagem WhatsApp

Retorne APENAS um JSON válido com esta estrutura (sem markdown):
{
  "oportunidades": ["oportunidade 1", "oportunidade 2"],
  "alertas": ["alerta 1", "alerta 2"],
  "proximos_passos": ["passo 1", "passo 2"],
  "analise_concorrencial": "análise sobre taxa de mensagens por clique vs mercado (benchmark 3-5%)"
}`;

  try {
    const resposta = await chamarClaudeAPI(prompt);
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return {
      oportunidades: ['Dados insuficientes para gerar insights'],
      alertas: [],
      proximos_passos: ['Aguarde mais dados históricos'],
      analise_concorrencial: 'Análise indisponível',
    };
  }
}

export async function previsaoROAS(historico_30d: CampanhaDados[]): Promise<PrevisaoROAS> {
  const mediaRoas = historico_30d.reduce((sum, c) => sum + c.roas, 0) / historico_30d.length;
  const roasMax = Math.max(...historico_30d.map((c) => c.roas));
  const roasMin = Math.min(...historico_30d.map((c) => c.roas));
  const volatilidade = roasMax - roasMin;

  const totalCliques = historico_30d.reduce((sum, c) => sum + c.clicks, 0);
  const totalMensagens = historico_30d.reduce((sum, c) => sum + (c.totalConversasIniciadasMensagem || 0), 0);
  const taxaMensagensMedia = totalCliques > 0 ? (totalMensagens / totalCliques) * 100 : 0;

  const prompt = `Baseado neste histórico de 30 dias, faça uma previsão de ROAS considerando o FUNIL (Anúncio → Tráfego → Mensagens):

ROAS Médio: ${mediaRoas.toFixed(2)}x
ROAS Máximo: ${roasMax.toFixed(2)}x
ROAS Mínimo: ${roasMin.toFixed(2)}x
Volatilidade: ${volatilidade.toFixed(2)}x

Taxa média de Mensagens Iniciadas por Clique: ${taxaMensagensMedia.toFixed(2)}%
Total de Mensagens em 30d: ${totalMensagens}
Total de Cliques em 30d: ${totalCliques}

O ROAS é calculado como: LTV do cliente / Spend. Nem toda mensagem se converte, mas a taxa de mensagens é predictor chave da qualidade da campanha e da viabilidade de venda futura.

Retorne APENAS um JSON válido (sem markdown):
{
  "roas_previsto": número com 2 decimais,
  "confianca": número entre 0-100,
  "fatores": ["fator 1", "fator 2", "fator 3"]
}`;

  try {
    const resposta = await chamarClaudeAPI(prompt);
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro na previsão:', error);
    return {
      roas_previsto: mediaRoas,
      confianca: 60,
      fatores: ['Dados históricos insuficientes', 'Qualidade de mensagens em análise', 'Padrão de funil em consolidação'],
    };
  }
}

export async function calcularBenchmarks(dados_campanha: CampanhaDados[]) {
  const mediasCPM = 15;
  const mediasCPC = 2.5;
  const mediasROAS = 2.0;
  const benchmarkTaxaMensagens = 3.5;

  const nossosCPM = dados_campanha.length > 0 ? (dados_campanha[0].spend * 1000) / dados_campanha[0].impressions : 0;
  const nossosCPC = dados_campanha.length > 0 ? dados_campanha[0].cpc : 0;
  const nossosROAS = dados_campanha.length > 0 ? dados_campanha[0].roas : 0;

  let nossaTaxaMensagens = 0;
  if (dados_campanha.length > 0 && dados_campanha[0].clicks > 0) {
    nossaTaxaMensagens = ((dados_campanha[0].totalConversasIniciadasMensagem || 0) / dados_campanha[0].clicks) * 100;
  }

  return {
    seu_cpm: nossosCPM.toFixed(2),
    industria_cpm: mediasCPM.toFixed(2),
    seu_cpc: nossosCPC.toFixed(2),
    industria_cpc: mediasCPC.toFixed(2),
    seu_roas: nossosROAS.toFixed(2),
    industria_roas: mediasROAS.toFixed(2),
    sua_taxa_mensagens: nossaTaxaMensagens.toFixed(2),
    benchmark_taxa_mensagens: benchmarkTaxaMensagens.toFixed(2),
    posicao_cpm: nossosCPM <= mediasCPM ? 'melhor' : 'pior',
    posicao_cpc: nossosCPC <= mediasCPC ? 'melhor' : 'pior',
    posicao_roas: nossosROAS >= mediasROAS ? 'melhor' : 'pior',
    posicao_taxa_mensagens: nossaTaxaMensagens >= benchmarkTaxaMensagens ? 'melhor' : 'pior',
  };
}
