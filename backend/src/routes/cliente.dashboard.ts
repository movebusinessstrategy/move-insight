import { Router } from 'express';
import { handleObterResumoCliente, handleObterCampanhasCliente } from '../modules/cliente/dashboard.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/resumo', requireClienteAuth, handleObterResumoCliente);
router.get('/campanhas', requireClienteAuth, handleObterCampanhasCliente);

export default router;
