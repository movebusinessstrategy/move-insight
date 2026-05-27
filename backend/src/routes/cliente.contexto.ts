import { Router } from 'express';
import {
  handleObterContextoCliente,
  handleAtualizarContextoCliente,
} from '../modules/cliente/contexto.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireClienteAuth, handleObterContextoCliente);
router.put('/', requireClienteAuth, handleAtualizarContextoCliente);

export default router;
