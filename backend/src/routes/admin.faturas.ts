import { Router } from 'express';
import {
  handleListarFaturas,
  handleRegistrarPagamento,
  handleObterResumoFinanceiro,
  handleObterFaturamentoMensal,
  handleEnviarReminderFatura,
  handleEnviarRelatorioFinanceiro,
} from '../modules/admin/faturas.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/clientes/:clienteId/faturas', requireAdminAuth, handleListarFaturas);
router.post('/clientes/:clienteId/faturas/:faturaId/pagar', requireAdminAuth, handleRegistrarPagamento);
router.get('/clientes/:clienteId/resumo-financeiro', requireAdminAuth, handleObterResumoFinanceiro);
router.get('/clientes/:clienteId/faturamento-mensal', requireAdminAuth, handleObterFaturamentoMensal);
router.post('/clientes/:clienteId/faturas/:faturaId/enviar-reminder', requireAdminAuth, handleEnviarReminderFatura);
router.post('/clientes/:clienteId/enviar-relatorio', requireAdminAuth, handleEnviarRelatorioFinanceiro);

export default router;
