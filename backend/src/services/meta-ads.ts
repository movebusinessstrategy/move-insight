import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const API_VERSION = process.env.META_ADS_API_VERSION || 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Campanha {
  nome: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  spend: number;
  cpm: number;
  cpc: number;
  frequencia: number;
  conversasIniciadasMensagem?: number;
}

interface Relatorio {
  periodo: string;
  campanhas: Campanha[];
  resumo: {
    totalSpend: number;
    totalImpressoes: number;
    totalCliques: number;
    totalConversoes: number;
    totalConversasIniciadasMensagem: number;
    roas: number;
    cpmMedio: number;
    cpcMedio: number;
  };
}

type DatePreset = 'last_7d' | 'last_30d' | 'last_90d';

function getDateRangeFromPreset(preset: DatePreset): { since: string; until: string; display: string } {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const until = `${ano}-${mes}-${dia}`;

  let since: string;
  let daysAgo: number;

  switch (preset) {
    case 'last_7d':
      daysAgo = 7;
      break;
    case 'last_30d':
      daysAgo = 30;
      break;
    case 'last_90d':
      daysAgo = 90;
      break;
    default:
      daysAgo = 7;
  }

  const dataInicial = new Date(hoje.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const anoInicial = dataInicial.getFullYear();
  const mesInicial = String(dataInicial.getMonth() + 1).padStart(2, '0');
  const diaInicial = String(dataInicial.getDate()).padStart(2, '0');
  since = `${anoInicial}-${mesInicial}-${diaInicial}`;

  const display = `${dataInicial.toLocaleDateString('pt-BR')} - ${hoje.toLocaleDateString('pt-BR')}`;

  return { since, until, display };
}

async function getCampaigns(accountId: string): Promise<any[]> {
  try {
    const response = await axios.get(`${BASE_URL}/act_${accountId}/campaigns`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'id,name,status',
      },
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar campanhas do Meta Ads:', error);
    return [];
  }
}

async function getCampaignInsights(campaignId: string, since: string, until: string): Promise<any> {
  try {
    const response = await axios.get(`${BASE_URL}/${campaignId}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'impressions,clicks,ctr,actions,spend,frequency',
        since,
        until,
        time_range: JSON.stringify({ since, until }),
      },
    });

    const data = response.data.data?.[0] || {};

    // Log de todos os actions para debug
    console.log(`[Meta Ads] Campaign ${campaignId} - TODOS os ACTIONS:`,
      JSON.stringify(data.actions, null, 2)
    );

    const impressoes = parseInt(data.impressions) || 0;
    const cliques = parseInt(data.clicks) || 0;
    const spend = parseFloat(data.spend) || 0;
    const conversoes = data.actions?.find((a: any) => a.action_type === 'offsite_conversion')?.value || 0;
    const frequencia = parseFloat(data.frequency) || 0;

    // Procura em vários tipos possíveis de conversas iniciadas
    let conversasIniciadasMensagem = 0;
    const actionTypes = data.actions?.map((a: any) => a.action_type) || [];

    if (data.actions && Array.isArray(data.actions)) {
      // Procura por qualquer action relacionado a mensagens
      const messagingAction = data.actions.find((a: any) =>
        a.action_type?.toLowerCase().includes('messaging') ||
        a.action_type?.toLowerCase().includes('conversation') ||
        a.action_type?.toLowerCase().includes('message')
      );

      if (messagingAction) {
        conversasIniciadasMensagem = parseInt(messagingAction.value) || 0;
        console.log(`[Meta Ads] Campaign ${campaignId} - ENCONTRADO: ${messagingAction.action_type} = ${conversasIniciadasMensagem} conversas`);
      } else {
        console.log(`[Meta Ads] Campaign ${campaignId} - Nenhum action com messaging/conversation encontrado. Actions disponíveis:`, actionTypes);
      }
    } else {
      console.log(`[Meta Ads] Campaign ${campaignId} - Nenhum data.actions encontrado`);
    }

    console.log(`[Meta Ads] Campaign ${campaignId} - RESUMO: Spend=${spend}, Cliques=${cliques}, Conversas=${conversasIniciadasMensagem}`);

    const cpm = impressoes > 0 ? (spend / impressoes) * 1000 : 0;
    const cpc = cliques > 0 ? spend / cliques : 0;

    return {
      impressoes,
      cliques,
      ctr: parseFloat(data.ctr) || 0,
      conversoes,
      spend,
      cpm,
      cpc,
      frequencia,
      conversasIniciadasMensagem,
    };
  } catch (error) {
    console.error('Erro ao buscar insights da campanha:', error);
    return {
      impressoes: 0,
      cliques: 0,
      ctr: 0,
      conversoes: 0,
      spend: 0,
      cpm: 0,
      cpc: 0,
      frequencia: 0,
      conversasIniciadasMensagem: 0,
    };
  }
}

export async function obterContasMetaAds(
  accountId: string,
  dataInicial: Date,
  dataFinal: Date
): Promise<
  Array<{
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
  }>
> {
  try {
    const since = dataInicial.toISOString().split('T')[0];
    const until = dataFinal.toISOString().split('T')[0];

    console.log(`[obterContasMetaAds] Buscando campanhas para account ${accountId}, período ${since} a ${until}`);
    const todasAsCampanhas = await getCampaigns(accountId);
    console.log(`[obterContasMetaAds] Total de campanhas encontradas: ${todasAsCampanhas.length}`);

    if (todasAsCampanhas.length === 0) {
      console.warn(`[obterContasMetaAds] ⚠️ Nenhuma campanha encontrada para account ${accountId}. Verifique o token ou a conta Meta Ads.`);
      return [];
    }

    // Usar todas as campanhas, não apenas ativas
    const campanhasParaAnalisar = todasAsCampanhas;
    console.log(`[obterContasMetaAds] Analisando ${campanhasParaAnalisar.length} campanhas...`);

    const campanhasComDados = await Promise.all(
      campanhasParaAnalisar.map(async (camp) => {
        try {
          const insights = await getCampaignInsights(camp.id, since, until);
          const roas =
            insights.conversoes > 0 && insights.spend > 0 ? insights.conversoes / insights.spend : 0;

          return {
            id: camp.id,
            name: camp.name,
            impressions: insights.impressoes,
            clicks: insights.cliques,
            conversions: Math.round(insights.conversoes),
            spend: insights.spend,
            ctr: insights.ctr,
            cpc: insights.cpc,
            ctr_rate: insights.ctr,
            roas,
            totalConversasIniciadasMensagem: insights.conversasIniciadasMensagem,
          };
        } catch (campError) {
          console.error(`[obterContasMetaAds] Erro ao processar campanha ${camp.id}:`, campError);
          return {
            id: camp.id,
            name: camp.name,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            ctr: 0,
            cpc: 0,
            ctr_rate: 0,
            roas: 0,
            totalConversasIniciadasMensagem: 0,
          };
        }
      })
    );

    // Filtrar apenas campanhas com dados (spend > 0 ou cliques > 0)
    const campanhasComDadosValidos = campanhasComDados.filter((camp) => camp.spend > 0 || camp.clicks > 0);

    console.log(`[obterContasMetaAds] ✅ Retornando ${campanhasComDadosValidos.length} campanhas com dados (filtradas ${campanhasComDados.length - campanhasComDadosValidos.length} sem dados)`);
    return campanhasComDadosValidos;
  } catch (error) {
    console.error('Erro ao obter contas Meta Ads:', error);
    return [];
  }
}

export async function gerarRelatorio(
  accountId: string,
  period?: DatePreset | { since: string; until: string }
): Promise<Relatorio> {
  try {
    console.log(`[gerarRelatorio] period recebido:`, period);
    let dateRange: { since: string; until: string; display: string };

    if (!period || typeof period === 'string') {
      dateRange = getDateRangeFromPreset((period as DatePreset) || 'last_7d');
    } else {
      dateRange = {
        since: period.since,
        until: period.until,
        display: `${new Date(period.since).toLocaleDateString('pt-BR')} - ${new Date(period.until).toLocaleDateString('pt-BR')}`,
      };
    }

    console.log(`[gerarRelatorio] dateRange:`, dateRange);

    const todasAsCampanhas = await getCampaigns(accountId);
    const campanhasAtivas = todasAsCampanhas.filter((c: any) => c.status === 'ACTIVE');

    const campanhasComDados: Campanha[] = await Promise.all(
      campanhasAtivas.map(async (camp) => {
        const insights = await getCampaignInsights(camp.id, dateRange.since, dateRange.until);
        return {
          id: camp.id,
          nome: camp.name,
          ...insights,
        };
      })
    );

    const totalSpend = campanhasComDados.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressoes = campanhasComDados.reduce((sum, c) => sum + c.impressoes, 0);
    const totalCliques = campanhasComDados.reduce((sum, c) => sum + c.cliques, 0);
    const totalConversoes = campanhasComDados.reduce((sum, c) => sum + c.conversoes, 0);
    const totalConversasIniciadasMensagem = campanhasComDados.reduce((sum, c) => sum + (c.conversasIniciadasMensagem || 0), 0);
    const cpmMedio = campanhasComDados.length > 0
      ? campanhasComDados.reduce((sum, c) => sum + c.cpm, 0) / campanhasComDados.length
      : 0;
    const cpcMedio = campanhasComDados.length > 0
      ? campanhasComDados.reduce((sum, c) => sum + c.cpc, 0) / campanhasComDados.length
      : 0;
    const roas = totalSpend > 0 ? totalConversoes / totalSpend : 0;

    return {
      periodo: dateRange.display,
      campanhas: campanhasComDados,
      resumo: {
        totalSpend,
        totalImpressoes,
        totalCliques,
        totalConversoes,
        totalConversasIniciadasMensagem,
        roas,
        cpmMedio,
        cpcMedio,
      },
    };
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw new Error('Erro ao gerar relatório de Meta Ads');
  }
}

function formatarRelatorioFallback(relatorio: Relatorio, nomeCliente?: string): string {
  const saudacao = getSaudacao();
  const nomeFormatado = nomeCliente ? nomeCliente.split(' ')[0] : 'você';
  const introducao = `${saudacao} ${nomeFormatado}! Estou te mandando um relatório para acompanhar como foi o andamento de suas campanhas essa semana.`;

  const linhas = [
    introducao,
    '',
    `Período: ${relatorio.periodo}`,
    '',
  ];

  if (relatorio.campanhas.length > 0) {
    relatorio.campanhas.forEach((camp) => {
      if (camp.spend > 0) {
        linhas.push(`${camp.nome}`);
        linhas.push(`Investimento: R$ ${camp.spend.toFixed(2)}`);
        linhas.push(`Pessoas que viram: ${camp.impressoes.toLocaleString('pt-BR')}`);
        linhas.push(`Cliques: ${camp.cliques}`);
        if (camp.conversasIniciadasMensagem && camp.conversasIniciadasMensagem > 0) {
          linhas.push(`Conversas iniciadas: ${camp.conversasIniciadasMensagem}`);
        }
        linhas.push('');
      }
    });
  }

  if (relatorio.campanhas.some((c) => c.spend > 0)) {
    linhas.push('RESUMO');
    linhas.push('');
    linhas.push(`Total gasto: R$ ${relatorio.resumo.totalSpend.toFixed(2)}`);
    linhas.push(`Total de visualizações: ${relatorio.resumo.totalImpressoes.toLocaleString('pt-BR')}`);
    linhas.push(`Total de cliques: ${relatorio.resumo.totalCliques}`);
  }

  linhas.push('');
  linhas.push('MOVE Insights');

  return linhas.join('\n');
}

function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return 'Bom dia';
  } else if (hora >= 12 && hora < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

export async function formatarRelatorioWhatsApp(relatorio: Relatorio, nomeCliente?: string): Promise<string> {
  try {
    const campanhasDesc = relatorio.campanhas
      .filter((c) => c.spend > 0)
      .map((c) => {
        let desc = `${c.nome}: R$ ${c.spend.toFixed(2)} investidos, ${c.impressoes} pessoas viram, ${c.cliques} cliques`;
        if (c.conversasIniciadasMensagem && c.conversasIniciadasMensagem > 0) {
          desc += `, ${c.conversasIniciadasMensagem} pessoas iniciaram conversa`;
        }
        return desc;
      })
      .join('\n');

    const saudacao = getSaudacao();
    const nomeFormatado = nomeCliente ? nomeCliente.split(' ')[0] : 'você';
    const introducao = `${saudacao} ${nomeFormatado}! Estou te mandando um relatório para acompanhar como foi o andamento de suas campanhas essa semana.`;

    const prompt = `Você é um gestor de tráfego escrevendo um relatório simples para seu cliente entender como os anúncios estão indo.

IMPORTANTE - Regras obrigatórias:
- NENHUM emoji
- NENHUMA formatação (sem negrito, sem asteriscos, sem travessões)
- Linguagem super simples, para quem não entende de marketing
- Máximo 12 linhas (incluindo introdução)
- Números com ponto decimal (R$ 1.234,56)

Comece com essa introdução (ou similar):
"${introducao}"

Depois liste os dados:

Dados do período ${relatorio.periodo}:

${campanhasDesc}

Total gasto: R$ ${relatorio.resumo.totalSpend.toFixed(2)}
Pessoas que viram seus anúncios: ${relatorio.resumo.totalImpressoes}
Pessoas que clicaram: ${relatorio.resumo.totalCliques}

Escreva a mensagem com a introdução, depois os dados, e termine motivando a continuar investindo.`;

    console.log(`[Claude] Enviando prompt para geração de mensagem`);
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });
    console.log(`[Claude] Resposta recebida da API`);

    const content = message.content[0];
    if (content.type === 'text') {
      console.log(`[Claude] Mensagem gerada, primeiras 100 chars:`, content.text.substring(0, 100));
      return content.text;
    }

    console.log(`[Claude] Tipo inesperado: ${content.type}, usando fallback`);
    return formatarRelatorioFallback(relatorio, nomeCliente);
  } catch (error) {
    console.error('Erro ao gerar mensagem com Claude:', error);
    console.log(`[Claude] Erro, usando fallback`);
    return formatarRelatorioFallback(relatorio, nomeCliente);
  }
}
