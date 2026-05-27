import { Router } from 'express';
import {
  handleCriarContaPagar,
  handleListarContasPagar,
  handleListarContasAtrasadas,
  handleObterContaPagar,
  handleAtualizarContaPagar,
  handleMarcarComoPago,
  handleDeletarContaPagar,
} from '../modules/admin/contas-pagar.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/contas-pagar', requireAdminAuth, handleCriarContaPagar);
router.get('/contas-pagar', requireAdminAuth, handleListarContasPagar);
router.get('/contas-pagar/atrasadas', requireAdminAuth, handleListarContasAtrasadas);
router.get('/contas-pagar/:contaId', requireAdminAuth, handleObterContaPagar);
router.put('/contas-pagar/:contaId', requireAdminAuth, handleAtualizarContaPagar);
router.patch('/contas-pagar/:contaId/pagar', requireAdminAuth, handleMarcarComoPago);
router.delete('/contas-pagar/:contaId', requireAdminAuth, handleDeletarContaPagar);

export default router;
