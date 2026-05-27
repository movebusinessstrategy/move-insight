import { Router } from 'express';
import {
  handleObterResumoRelatorio,
  handleObterAnaliseIA,
  handleObterPrevisoes,
  handleObterBenchmarks,
} from '../modules/cliente/relatorio.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/relatorio/resumo', requireClienteAuth, handleObterResumoRelatorio);
router.get('/relatorio/analise-ia', requireClienteAuth, handleObterAnaliseIA);
router.get('/relatorio/previsoes', requireClienteAuth, handleObterPrevisoes);
router.get('/relatorio/benchmarks', requireClienteAuth, handleObterBenchmarks);

export default router;
