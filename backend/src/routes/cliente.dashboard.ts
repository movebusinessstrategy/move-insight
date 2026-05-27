import { Router } from 'express';
import {
  handleObterResumoCliente,
  handleListarCampanhasCliente,
  handleObterComparativoCliente,
  handleObterTendenciasCliente,
} from '../modules/cliente/dashboard.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/resumo', requireClienteAuth, handleObterResumoCliente);
router.get('/campanhas', requireClienteAuth, handleListarCampanhasCliente);
router.get('/comparativo', requireClienteAuth, handleObterComparativoCliente);
router.get('/tendencias', requireClienteAuth, handleObterTendenciasCliente);

export default router;
