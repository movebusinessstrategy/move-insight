import { Router } from 'express';
import {
  handleCriarCliente,
  handleListarClientes,
  handleObterCliente,
  handleEnviarLembrance,
  handleAtualizarCliente,
  handleGerarRelatorio,
} from '../modules/admin/clientes.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/clientes', requireAdminAuth, handleCriarCliente);
router.get('/clientes', requireAdminAuth, handleListarClientes);
router.get('/clientes/:clienteId', requireAdminAuth, handleObterCliente);
router.put('/clientes/:clienteId', requireAdminAuth, handleAtualizarCliente);
router.get('/clientes/:clienteId/relatorio', requireAdminAuth, handleGerarRelatorio);
router.post('/clientes/:clienteId/lembrar-pagamento', requireAdminAuth, handleEnviarLembrance);

export default router;
