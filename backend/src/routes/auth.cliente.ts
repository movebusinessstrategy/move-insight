import { Router } from 'express';
import { handleClienteLogin, handleClienteLogout } from '../modules/auth/cliente.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/login', handleClienteLogin);
router.post('/logout', requireClienteAuth, handleClienteLogout);

export default router;
