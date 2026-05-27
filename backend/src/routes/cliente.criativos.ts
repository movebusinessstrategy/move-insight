import { Router } from 'express';
import {
  handleGerarSugestoes,
  handleObterHistorico,
  handleDeletarSugestao,
} from '../modules/cliente/criativos.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/gerar', requireClienteAuth, handleGerarSugestoes);
router.get('/historico', requireClienteAuth, handleObterHistorico);
router.delete('/:sugestaoId', requireClienteAuth, handleDeletarSugestao);

export default router;
