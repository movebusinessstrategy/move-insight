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
  const prompt = `Analise este desempenho de Meta Ads e forneça uma análise em JSON estruturado.

Dados das campanhas:
${JSON.stringify(dados_campanha, null, 2)}

Retorne APENAS um JSON válido com esta estrutura (sem markdown):
{
  "score": número entre 0-100,
  "saude": "excelente" | "bom" | "regular" | "crítico",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recomendacoes": ["recom 1", "recom 2", "recom 3"]
}

Considere ao analisar:
- CTR (bom >= 2%)
- CPC (quanto menor melhor)
- ROAS (bom >= 2.0x)
- Spend vs Conversões`;

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

  const convsAnterior = dados_anterior.reduce((sum, c) => sum + c.conversions, 0);
  const convsAtual = dados_atual.reduce((sum, c) => sum + c.conversions, 0);
  const variacao_conversoes = convsAnterior > 0 ? ((convsAtual - convsAnterior) / convsAnterior) * 100 : 0;

  let tendencia: 'crescimento' | 'queda' | 'estável' = 'estável';
  if (variacao_conversoes > 5) tendencia = 'crescimento';
  else if (variacao_conversoes < -5) tendencia = 'queda';

  const prompt = `Baseado nesta comparação, faça uma análise breve:

  Variação de Spend: ${variacao_spend.toFixed(1)}%
  Variação de Cliques: ${variacao_cliques.toFixed(1)}%
  Variação de Conversões: ${variacao_conversoes.toFixed(1)}%
  Tendência: ${tendencia}

  Forneça uma análise concisa (máx 100 caracteres) sobre o que esses números indicam.`;

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
  const prompt = `Analise esta campanha Meta Ads e gere insights JSON:

Campanha: ${campanha.name}
Impressões: ${campanha.impressions}
Cliques: ${campanha.clicks}
Conversões: ${campanha.conversions}
Spend: R$ ${campanha.spend.toFixed(2)}
CTR: ${campanha.ctr_rate.toFixed(2)}%
CPC: R$ ${campanha.cpc.toFixed(2)}
ROAS: ${campanha.roas.toFixed(2)}x

Retorne APENAS um JSON válido com esta estrutura (sem markdown):
{
  "oportunidades": ["oportunidade 1", "oportunidade 2"],
  "alertas": ["alerta 1", "alerta 2"],
  "proximos_passos": ["passo 1", "passo 2"],
  "analise_concorrencial": "análise breve sobre posição competitiva"
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

  const prompt = `Baseado neste histórico de 30 dias, faça uma previsão:

ROAS Médio: ${mediaRoas.toFixed(2)}x
ROAS Máximo: ${roasMax.toFixed(2)}x
ROAS Mínimo: ${roasMin.toFixed(2)}x
Volatilidade: ${volatilidade.toFixed(2)}x

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
      fatores: ['Dados históricos insuficientes', 'Mercado em transição', 'Análise em progresso'],
    };
  }
}

export async function calcularBenchmarks(dados_campanha: CampanhaDados[]) {
  const mediasCPM = 15; // Hard-coded para indústria
  const mediasCPC = 2.5;
  const mediasROAS = 2.0;

  const nossosCPM = dados_campanha.length > 0 ? (dados_campanha[0].spend * 1000) / dados_campanha[0].impressions : 0;
  const nossosCPC = dados_campanha.length > 0 ? dados_campanha[0].cpc : 0;
  const nossosROAS = dados_campanha.length > 0 ? dados_campanha[0].roas : 0;

  return {
    seu_cpm: nossosCPM.toFixed(2),
    industria_cpm: mediasCPM.toFixed(2),
    seu_cpc: nossosCPC.toFixed(2),
    industria_cpc: mediasCPC.toFixed(2),
    seu_roas: nossosROAS.toFixed(2),
    industria_roas: mediasROAS.toFixed(2),
    posicao_cpm: nossosCPM <= mediasCPM ? 'melhor' : 'pior',
    posicao_cpc: nossosCPC <= mediasCPC ? 'melhor' : 'pior',
    posicao_roas: nossosROAS >= mediasROAS ? 'melhor' : 'pior',
  };
}
