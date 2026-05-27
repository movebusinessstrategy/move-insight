import cron from 'node-cron';
import { Queue } from 'bullmq';
import { db } from '../db/client.js';

interface RelatorioJobData {
  clienteId: string;
  frequencia: 'semanal' | 'mensal';
}

export async function startReportScheduler(reportQueue: Queue<RelatorioJobData>) {
  try {
    // Buscar clientes com frequência de relatório ativa
    const clientes = await db<Array<{ id: string; report_frequency: string; meta_ads_account_id?: string }>>`
      SELECT id, report_frequency, meta_ads_account_id
      FROM clientes
      WHERE report_frequency IN ('semanal', 'mensal') AND status = 'ativo'
    `;

    // Agenda semanal (segundas 9h América/São Paulo)
    cron.schedule(
      '0 9 * * 1',
      async () => {
        for (const cliente of clientes) {
          if (cliente.report_frequency === 'semanal' && cliente.meta_ads_account_id) {
            await reportQueue.add(
              `relatorio-${cliente.id}-semanal`,
              { clienteId: cliente.id, frequencia: 'semanal' },
              { repeat: { pattern: '0 9 * * 1' } }
            );
          }
        }
      },
      { timezone: 'America/Sao_Paulo' }
    );

    // Agenda mensal (1º dia 9h)
    cron.schedule(
      '0 9 1 * *',
      async () => {
        for (const cliente of clientes) {
          if (cliente.report_frequency === 'mensal' && cliente.meta_ads_account_id) {
            await reportQueue.add(
              `relatorio-${cliente.id}-mensal`,
              { clienteId: cliente.id, frequencia: 'mensal' }
            );
          }
        }
      },
      { timezone: 'America/Sao_Paulo' }
    );

    console.log('✅ Scheduler de relatórios iniciado');
  } catch (error) {
    console.error('❌ Erro ao inicializar scheduler de relatórios:', error);
    throw error;
  }
}
