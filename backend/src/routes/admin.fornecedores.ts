import { Router } from 'express';
import {
  handleCriarFornecedor,
  handleListarFornecedores,
  handleObterFornecedor,
  handleAtualizarFornecedor,
  handleDeletarFornecedor,
} from '../modules/admin/fornecedores.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/fornecedores', requireAdminAuth, handleCriarFornecedor);
router.get('/fornecedores', requireAdminAuth, handleListarFornecedores);
router.get('/fornecedores/:fornecedorId', requireAdminAuth, handleObterFornecedor);
router.put('/fornecedores/:fornecedorId', requireAdminAuth, handleAtualizarFornecedor);
router.delete('/fornecedores/:fornecedorId', requireAdminAuth, handleDeletarFornecedor);

export default router;
