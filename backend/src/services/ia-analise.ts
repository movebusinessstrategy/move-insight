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
  const totalImpressoes = dados_campanha.reduce((sum, c) => sum + c.impressions, 0);
  const totalSpend = dados_campanha.reduce((sum, c) => sum + c.spend, 0);
  const ctrGlobal = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100) : 0;

  const prompt = `Você é um especialista em funis de tráfego para WhatsApp. Analise este desempenho de campanhas Meta Ads com FOCO EXCLUSIVO em MENSAGENS INICIADAS.

A métrica de sucesso é: TAXA DE MENSAGENS INICIADAS POR CLIQUE. Quanto maior, melhor o funil está funcionando.

DADOS AGREGADOS DAS CAMPANHAS:
- Total de Mensagens Iniciadas: ${totalMensagens}
- Total de Cliques: ${totalCliques}
- Taxa de Mensagens por Clique: ${taxaMensagensGlobal.toFixed(2)}%
- Total de Impressões: ${totalImpressoes}
- CTR Global: ${ctrGlobal.toFixed(2)}%
- Gasto Total: R$ ${totalSpend.toFixed(2)}
- Campanhas Ativas: ${dados_campanha.length}

BENCHMARK PARA AVALIAÇÃO:
- Taxa Excelente: >= 5% (muito bom, público muito qualificado)
- Taxa Boa: 3-5% (normal, funil funcionando)
- Taxa Regular: 1-3% (baixa, precisa otimizar público/anúncio)
- Taxa Crítica: < 1% (muito baixa, rever estratégia)

ANÁLISE NECESSÁRIA:
1. Como está sua taxa de mensagens? (compare com benchmark)
2. Qual é o principal gargalo? (tráfego não qualificado? anúncio fraco? público errado?)
3. O que fazer para AUMENTAR essa taxa?

Retorne APENAS um JSON válido (sem markdown):
{
  "score": número entre 0-100 (baseado em taxa de mensagens vs benchmark),
  "saude": "excelente" | "bom" | "regular" | "crítico",
  "insights": ["insight 1 sobre sua taxa", "insight 2 sobre qualidade", "insight 3 acionável"],
  "recomendacoes": ["ação 1 para aumentar taxa", "ação 2 para qualificar público", "ação 3"]
}`;

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
      insights: [
        `Taxa atual: ${taxaMensagensGlobal.toFixed(2)}% (benchmark: 3-5%)`,
        `Total de mensagens: ${totalMensagens} de ${totalCliques} cliques`,
        'Foco em aumentar a taxa de conversão de clique → mensagem'
      ],
      recomendacoes: [
        'Otimize o público-alvo para atrair pessoas mais interessadas em conversar',
        'Teste diferentes ângulos de anúncio e copy',
        'Analyze quais campanhas têm taxa mais alta e replique'
      ],
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
  const cpmValue = campanha.impressions > 0 ? (campanha.spend / campanha.impressions) * 1000 : 0;

  const prompt = `Analise esta campanha Meta Ads EXCLUSIVAMENTE pela ótica de MENSAGENS INICIADAS NO WHATSAPP. O sucesso é medido por: quantas mensagens estão sendo iniciadas por clique.

DADOS DA CAMPANHA:
- Nome: ${campanha.name}
- Mensagens Iniciadas: ${campanha.totalConversasIniciadasMensagem || 0}
- Taxa de Mensagens por Clique: ${taxaMensagensPercentual.toFixed(2)}%
- Total de Cliques: ${campanha.clicks}
- Total de Impressões: ${campanha.impressions}
- Gasto: R$ ${campanha.spend.toFixed(2)}
- CPM: R$ ${cpmValue.toFixed(2)}
- CTR: ${campanha.ctr_rate.toFixed(2)}%
- CPC: R$ ${campanha.cpc.toFixed(2)}

BENCHMARK DE REFERÊNCIA:
- Taxa boa de mensagens por clique: 3-5%
- Taxa excelente: >5%
- Taxa baixa: <2%

FOCO EXCLUSIVO:
1. O objetivo é MAXIMIZAR mensagens iniciadas
2. Tráfego de qualidade é aquele que gera mais mensagens WhatsApp
3. O CPC é relevante apenas como custo para trazer o clique que pode virar mensagem
4. Qualidade do anúncio = taxa de conversão (clique → mensagem)

Analise esta campanha respondendo:
- Como a taxa de mensagens por clique pode ser AUMENTADA?
- Qual é o principal gargalo (CPM alto? CTR baixo? Público não qualificado?)?
- Como o anúncio/público pode ser otimizado para gerar MAIS mensagens por clique?
- A campanha está atraindo o público certo para mensagens WhatsApp?

Retorne APENAS um JSON válido (sem markdown):
{
  "oportunidades": ["oportinidade 1 para aumentar mensagens", "oportunidade 2", "oportunidade 3"],
  "alertas": ["alerta 1 sobre gargalo", "alerta 2"],
  "proximos_passos": ["ação 1 para aumentar taxa", "ação 2", "ação 3"],
  "analise_concorrencial": "Comparação com benchmark de mercado: Sua taxa (${taxaMensagensPercentual.toFixed(2)}%) vs referência (3-5%): [análise sobre posicionamento]"
}`;

  try {
    const resposta = await chamarClaudeAPI(prompt);
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Resposta não contém JSON válido');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return {
      oportunidades: ['Analise suas mensagens por clique - quanto maior, melhor', 'Compare sua taxa com o benchmark de 3-5%'],
      alertas: [],
      proximos_passos: ['Otimize o público para atrair quem tem interesse em conversar via WhatsApp', 'Teste diferentes ângulos de anúncios'],
      analise_concorrencial: 'Sua taxa de mensagens está sendo comparada ao benchmark. Foco total em aumentar esse número.',
    };
  }
}

export async function previsaoROAS(historico_30d: CampanhaDados[]): Promise<PrevisaoROAS> {
  // Nota: ROAS não é mais o foco principal. Focar em taxa de mensagens.
  const mediaRoas = 2.0; // Valor padrão
  const roasMax = 3.5;
  const roasMin = 1.2;
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
  const nossosROAS = 0; // ROAS removido do foco

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
