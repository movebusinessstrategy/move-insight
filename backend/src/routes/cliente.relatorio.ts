import { Router } from 'express';
import {
  handleObterResumoRelatorio,
  handleObterAnaliseIA,
  handleObterPrevisoes,
  handleObterBenchmarks,
  handleEnviarRelatorioCliente,
} from '../modules/cliente/relatorio.controller.js';
import { requireAdminAuth, requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

// Admin routes: /api/admin/clientes/:clienteId/relatorio/*
router.get('/clientes/:clienteId/relatorio/resumo', requireAdminAuth, handleObterResumoRelatorio);
router.get('/clientes/:clienteId/relatorio/analise-ia', requireAdminAuth, handleObterAnaliseIA);
router.get('/clientes/:clienteId/relatorio/previsoes', requireAdminAuth, handleObterPrevisoes);
router.get('/clientes/:clienteId/relatorio/benchmarks', requireAdminAuth, handleObterBenchmarks);

// Client routes: /api/cliente/relatorio/*
router.get('/resumo', requireClienteAuth, handleObterResumoRelatorio);
router.post('/enviar', requireClienteAuth, handleEnviarRelatorioCliente);

export default router;
