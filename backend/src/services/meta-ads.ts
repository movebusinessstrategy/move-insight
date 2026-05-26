import axios from 'axios';

const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const API_VERSION = process.env.META_ADS_API_VERSION || 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface Campanha {
  nome: string;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  mensagens: number;
  spend: number;
  cpm: number;
  cpc: number;
  frequencia: number;
}

interface Relatorio {
  periodo: string;
  campanhas: Campanha[];
  resumo: {
    totalSpend: number;
    totalCliques: number;
    totalConversoes: number;
    totalMensagens: number;
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
    const impressoes = parseInt(data.impressions) || 0;
    const cliques = parseInt(data.clicks) || 0;
    const spend = parseFloat(data.spend) || 0;
    const conversoes = data.actions?.find((a: any) => a.action_type === 'offsite_conversion')?.value || 0;
    const mensagens = data.actions?.find((a: any) => a.action_type === 'messaging_conversation_started_7d')?.value || 0;
    const frequencia = parseFloat(data.frequency) || 0;

    const cpm = impressoes > 0 ? (spend / impressoes) * 1000 : 0;
    const cpc = cliques > 0 ? spend / cliques : 0;

    return {
      impressoes,
      cliques,
      ctr: parseFloat(data.ctr) || 0,
      conversoes,
      mensagens,
      spend,
      cpm,
      cpc,
      frequencia,
    };
  } catch (error) {
    console.error('Erro ao buscar insights da campanha:', error);
    return {
      impressoes: 0,
      cliques: 0,
      ctr: 0,
      conversoes: 0,
      mensagens: 0,
      spend: 0,
      cpm: 0,
      cpc: 0,
      frequencia: 0,
    };
  }
}

export async function gerarRelatorio(
  accountId: string,
  period?: DatePreset | { since: string; until: string }
): Promise<Relatorio> {
  try {
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

    const todasAsCampanhas = await getCampaigns(accountId);
    const campanhasAtivas = todasAsCampanhas.filter((c: any) => c.status === 'ACTIVE');

    const campanhasComDados: Campanha[] = await Promise.all(
      campanhasAtivas.map(async (camp) => {
        const insights = await getCampaignInsights(camp.id, dateRange.since, dateRange.until);
        return {
          nome: camp.name,
          ...insights,
        };
      })
    );

    const totalSpend = campanhasComDados.reduce((sum, c) => sum + c.spend, 0);
    const totalCliques = campanhasComDados.reduce((sum, c) => sum + c.cliques, 0);
    const totalConversoes = campanhasComDados.reduce((sum, c) => sum + c.conversoes, 0);
    const totalMensagens = campanhasComDados.reduce((sum, c) => sum + c.mensagens, 0);
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
        totalCliques,
        totalConversoes,
        totalMensagens,
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

export function formatarRelatorioWhatsApp(relatorio: Relatorio): string {
  const linhas = [
    '📊 *RELATÓRIO SEMANAL - META ADS*',
    '',
    `Período: ${relatorio.periodo}`,
    '',
    '🎯 *Campanhas:*',
    '',
  ];

  relatorio.campanhas.forEach((camp) => {
    linhas.push(`📱 *${camp.nome}*`);
    linhas.push(`├ Impressões: ${camp.impressoes.toLocaleString('pt-BR')}`);
    linhas.push(`├ Cliques: ${camp.cliques}`);
    linhas.push(`├ CTR: ${camp.ctr.toFixed(2)}%`);
    linhas.push(`├ Conversões: ${camp.conversoes}`);
    linhas.push(`├ Mensagens: ${camp.mensagens}`);
    linhas.push(`├ CPM: R$ ${camp.cpm.toFixed(2)}`);
    linhas.push(`├ CPC: R$ ${camp.cpc.toFixed(2)}`);
    linhas.push(`└ Spend: R$ ${camp.spend.toFixed(2)}`);
    linhas.push('');
  });

  linhas.push('💰 *Resumo Geral*');
  linhas.push(`├ Total Spend: R$ ${relatorio.resumo.totalSpend.toFixed(2)}`);
  linhas.push(`├ Total Cliques: ${relatorio.resumo.totalCliques}`);
  linhas.push(`├ Total Conversões: ${relatorio.resumo.totalConversoes}`);
  linhas.push(`├ Total Mensagens: ${relatorio.resumo.totalMensagens}`);
  linhas.push(`├ CPM Médio: R$ ${relatorio.resumo.cpmMedio.toFixed(2)}`);
  linhas.push(`├ CPC Médio: R$ ${relatorio.resumo.cpcMedio.toFixed(2)}`);
  linhas.push(`└ ROAS: ${relatorio.resumo.roas.toFixed(2)}x`);
  linhas.push('');
  linhas.push('Enviado por MOVE Insights');

  return linhas.join('\n');
}
