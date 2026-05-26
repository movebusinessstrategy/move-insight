import { Router } from 'express';
import { handleClienteLogin, handleClienteLogout, handleClienteMe } from '../modules/auth/cliente.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/login', handleClienteLogin);
router.get('/me', requireClienteAuth, handleClienteMe);
router.post('/logout', requireClienteAuth, handleClienteLogout);

export default router;
