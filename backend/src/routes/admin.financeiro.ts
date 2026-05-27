import { Router } from 'express';
import { handleObterResumoFinanceiro } from '../modules/admin/financeiro.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/financeiro/resumo', requireAdminAuth, handleObterResumoFinanceiro);

export default router;
