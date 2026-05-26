import { Router } from 'express';
import {
  handleListarClientes,
  handleObterCliente,
  handleEnviarLembrance,
} from '../modules/admin/clientes.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/clientes', requireAdminAuth, handleListarClientes);
router.get('/clientes/:clienteId', requireAdminAuth, handleObterCliente);
router.post('/clientes/:clienteId/lembrar-pagamento', requireAdminAuth, handleEnviarLembrance);

export default router;
