import cron from 'node-cron';
import { Queue } from 'bullmq';
import { listarClientesComFinanceiro } from '../modules/admin/clientes.service.js';

interface RelatorioJobData {
  clienteId: string;
  frequencia: 'semanal' | 'mensal';
}

export async function startReportScheduler(reportQueue: Queue<RelatorioJobData>) {
  const clientes = await listarClientesComFinanceiro();

  cron.schedule(
    '0 9 * * 1',
    async () => {
      const relatorioClientes = clientes.filter(
        (c) => c.relatorio_frequencia === 'semanal' && c.meta_ads_account_id
      );

      for (const cliente of relatorioClientes) {
        try {
          await reportQueue.add(`relatorio-${cliente.id}-semanal`, {
            clienteId: cliente.id,
            frequencia: 'semanal',
          });
          console.log(`📧 Job semanal agendado para cliente ${cliente.id}`);
        } catch (error) {
          console.error(`❌ Erro agendando job para cliente ${cliente.id}:`, error);
        }
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  cron.schedule(
    '0 9 1 * *',
    async () => {
      const relatorioClientes = clientes.filter(
        (c) => c.relatorio_frequencia === 'mensal' && c.meta_ads_account_id
      );

      for (const cliente of relatorioClientes) {
        try {
          await reportQueue.add(`relatorio-${cliente.id}-mensal`, {
            clienteId: cliente.id,
            frequencia: 'mensal',
          });
          console.log(`📧 Job mensal agendado para cliente ${cliente.id}`);
        } catch (error) {
          console.error(`❌ Erro agendando job para cliente ${cliente.id}:`, error);
        }
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('✅ Scheduler de relatórios iniciado (seg 9h / 1º dia 9h)');
}
