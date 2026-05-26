import { Worker, Job } from 'bullmq';
import { obterClientePorId, enviarRelatorioWhatsApp } from '../modules/admin/clientes.service.js';

interface RelatorioJobData {
  clienteId: string;
  frequencia: 'semanal' | 'mensal';
}

export function createRelatorioWorker() {
  return new Worker<RelatorioJobData>(
    'relatorio',
    async (job: Job<RelatorioJobData>) => {
      const { clienteId, frequencia } = job.data;

      try {
        const cliente = await obterClientePorId(clienteId);

        if (!cliente || cliente.status !== 'ativo') {
          throw new Error(`Cliente ${clienteId} não encontrado ou inativo`);
        }

        await enviarRelatorioWhatsApp(clienteId, frequencia);

        return { success: true, clienteId };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao processar relatório';
        console.error(`❌ Erro processando relatório para ${clienteId}:`, message);
        throw error;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }
  );
}
