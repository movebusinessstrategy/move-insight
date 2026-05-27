import { Router } from 'express';
import {
  handleCriarCliente,
  handleListarClientes,
  handleObterCliente,
  handleEnviarLembrance,
  handleAtualizarCliente,
  handleDeleteClient,
  handleGerarRelatorio,
  handleEnviarLembracaBatch,
  handleAtualizarClientesBatch,
  handlePreviewRelatorio,
  handleEnviarRelatorioAgora,
  handleAtualizarFrequenciaRelatorio,
  handleObterResumoRelatorio,
  handleObterAnaliseIA,
  handleObterPrevisoes,
  handleObterBenchmarks,
  handleCriarLoginCliente,
} from '../modules/admin/clientes.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/clientes', requireAdminAuth, handleCriarCliente);
router.get('/clientes', requireAdminAuth, handleListarClientes);
router.get('/clientes/:clienteId', requireAdminAuth, handleObterCliente);
router.put('/clientes/:clienteId', requireAdminAuth, handleAtualizarCliente);
router.delete('/clientes/:clienteId', requireAdminAuth, handleDeleteClient);
router.post('/clientes/:clienteId/login', requireAdminAuth, handleCriarLoginCliente);
router.get('/clientes/:clienteId/relatorio', requireAdminAuth, handleGerarRelatorio);
router.get('/clientes/:clienteId/relatorio/resumo', requireAdminAuth, handleObterResumoRelatorio);
router.get('/clientes/:clienteId/relatorio/analise-ia', requireAdminAuth, handleObterAnaliseIA);
router.get('/clientes/:clienteId/relatorio/previsoes', requireAdminAuth, handleObterPrevisoes);
router.get('/clientes/:clienteId/relatorio/benchmarks', requireAdminAuth, handleObterBenchmarks);
router.post('/clientes/:clienteId/lembrar-pagamento', requireAdminAuth, handleEnviarLembrance);
router.get('/clientes/:clienteId/relatorio/preview', requireAdminAuth, handlePreviewRelatorio);
router.post('/clientes/:clienteId/relatorio/enviar-agora', requireAdminAuth, handleEnviarRelatorioAgora);
router.put('/clientes/:clienteId/relatorio/frequencia', requireAdminAuth, handleAtualizarFrequenciaRelatorio);
router.post('/clientes/batch/lembrar-pagamento', requireAdminAuth, handleEnviarLembracaBatch);
router.post('/clientes/batch/update', requireAdminAuth, handleAtualizarClientesBatch);

export default router;
