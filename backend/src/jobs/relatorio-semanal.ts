import cron from 'node-cron';
import { listarClientesComFinanceiro } from '../modules/admin/clientes.service.js';
import { obterContasMetaAds } from '../services/meta-ads.js';
import { analisarDesempenhoCampanha } from '../services/ia-analise.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';

async function gerarMensagemRelatorio(clienteNome: string, campanhas: any, analise: any): Promise<string> {
  const totalSpend = campanhas.reduce((sum: number, c: any) => sum + c.spend, 0);
  const totalCliques = campanhas.reduce((sum: number, c: any) => sum + c.clicks, 0);
  const totalConversoes = campanhas.reduce((sum: number, c: any) => sum + c.conversions, 0);
  const mediaRoas = campanhas.length > 0 ? campanhas.reduce((sum: number, c: any) => sum + c.roas, 0) / campanhas.length : 0;

  let mensagem = `📊 *RELATÓRIO SEMANAL DE META ADS*\n\n`;
  mensagem += `👤 Cliente: ${clienteNome}\n`;
  mensagem += `📅 Período: Últimos 7 dias\n\n`;

  mensagem += `*📈 RESUMO GERAL:*\n`;
  mensagem += `💰 Investimento: R$ ${totalSpend.toFixed(2)}\n`;
  mensagem += `👆 Cliques: ${totalCliques.toLocaleString('pt-BR')}\n`;
  mensagem += `✅ Conversões: ${totalConversoes.toLocaleString('pt-BR')}\n`;
  mensagem += `📊 ROAS Médio: ${mediaRoas.toFixed(2)}x\n\n`;

  if (campanhas.length > 0) {
    mensagem += `*🏆 TOP CAMPANHAS:*\n`;
    campanhas
      .sort((a: any, b: any) => b.spend - a.spend)
      .slice(0, 3)
      .forEach((c: any) => {
        mensagem += `• ${c.name}: R$ ${c.spend.toFixed(2)} | ROAS ${c.roas.toFixed(2)}x\n`;
      });
    mensagem += '\n';
  }

  if (analise) {
    mensagem += `*🤖 ANÁLISE DE IA:*\n`;
    mensagem += `Score: ${analise.score}/100 | Status: ${analise.saude}\n\n`;

    if (analise.insights.length > 0) {
      mensagem += `*💡 INSIGHTS:*\n`;
      analise.insights.slice(0, 2).forEach((i: string) => {
        mensagem += `• ${i}\n`;
      });
      mensagem += '\n';
    }

    if (analise.recomendacoes.length > 0) {
      mensagem += `*🎯 RECOMENDAÇÕES:*\n`;
      analise.recomendacoes.slice(0, 2).forEach((r: string) => {
        mensagem += `• ${r}\n`;
      });
      mensagem += '\n';
    }
  }

  mensagem += `Para análise completa, acesse o dashboard: https://move-insights.app/relatorio\n`;
  mensagem += `\nPowered by MOVE Insights 🚀`;

  return mensagem;
}

export async function initRelatorioSemanal(): Promise<void> {
  // Segunda-feira 9h (Zona de São Paulo)
  cron.schedule(
    '0 9 * * 1',
    async () => {
      console.log('🔔 Iniciando envio de relatórios semanais...');

      try {
        const clientes = await listarClientesComFinanceiro();
        const clientesComMeta = clientes.filter((c: any) => c.meta_ads_account_id && c.whatsapp_numero);

        console.log(`📤 Enviando relatórios para ${clientesComMeta.length} clientes...`);

        for (const cliente of clientesComMeta) {
          try {
            // Obter dados da semana
            const dataFinal = new Date();
            const dataInicial = new Date();
            dataInicial.setDate(dataFinal.getDate() - 7);

            if (!cliente.meta_ads_account_id) {
              console.log(`⏭️ Cliente ${cliente.nome}: sem Meta Ads configurado`);
              continue;
            }

            if (!cliente.whatsapp_numero) {
              console.log(`⏭️ Cliente ${cliente.nome}: sem WhatsApp configurado`);
              continue;
            }

            const campanhas = await obterContasMetaAds(cliente.meta_ads_account_id, dataInicial, dataFinal);

            if (campanhas.length === 0) {
              console.log(`⏭️ Cliente ${cliente.nome}: sem campanhas ativas`);
              continue;
            }

            // Gerar análise de IA
            const analise = await analisarDesempenhoCampanha(campanhas);

            // Montar mensagem
            const mensagem = await gerarMensagemRelatorio(cliente.nome, campanhas, analise);

            // Enviar via WhatsApp
            const msgId = await sendWhatsAppMessage(cliente.whatsapp_numero, mensagem);

            if (msgId) {
              console.log(`✅ Relatório enviado para ${cliente.nome}`);
            } else {
              console.log(`❌ Falha ao enviar para ${cliente.nome}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao processar cliente ${cliente.nome}:`, error);
          }
        }

        console.log('✅ Envio de relatórios semanal concluído!');
      } catch (error) {
        console.error('❌ Erro ao enviar relatórios semanais:', error);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('✅ Scheduler de relatórios semanais inicializado');
}
