import { Worker, Job } from 'bullmq';
import { enviarRelatorioWhatsApp } from '../modules/admin/clientes.service.js';

interface RelatorioJobData {
  clienteId: string;
  frequencia: 'semanal' | 'mensal';
}

export function createRelatorioWorker(redisConnection: { host: string; port: number }) {
  return new Worker<RelatorioJobData>(
    'relatorio',
    async (job: Job<RelatorioJobData>) => {
      const { clienteId, frequencia } = job.data;

      try {
        await enviarRelatorioWhatsApp(clienteId, frequencia);
        return { success: true, clienteId, frequencia };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        throw new Error(`Erro ao enviar relatório para cliente ${clienteId}: ${message}`);
      }
    },
    {
      connection: redisConnection,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );
}
