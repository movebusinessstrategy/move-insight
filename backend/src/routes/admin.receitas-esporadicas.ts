import { Router } from 'express';
import {
  handleCriarReceitaEsporadica,
  handleListarReceitasEsporadicas,
  handleObterReceitaEsporadica,
  handleAtualizarReceitaEsporadica,
  handleMarcarComoRecebida,
  handleDeletarReceitaEsporadica,
} from '../modules/admin/receitas-esporadicas.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/receitas-esporadicas', requireAdminAuth, handleCriarReceitaEsporadica);
router.get('/receitas-esporadicas', requireAdminAuth, handleListarReceitasEsporadicas);
router.get('/receitas-esporadicas/:receitaId', requireAdminAuth, handleObterReceitaEsporadica);
router.put('/receitas-esporadicas/:receitaId', requireAdminAuth, handleAtualizarReceitaEsporadica);
router.patch('/receitas-esporadicas/:receitaId/receber', requireAdminAuth, handleMarcarComoRecebida);
router.delete('/receitas-esporadicas/:receitaId', requireAdminAuth, handleDeletarReceitaEsporadica);

export default router;
