import { Router } from 'express';
import { handleClienteLogin, handleClienteMe, handleClienteLogout } from '../modules/cliente/auth.controller.js';
import { requireClienteAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/login', handleClienteLogin);
router.get('/me', requireClienteAuth, handleClienteMe);
router.post('/logout', requireClienteAuth, handleClienteLogout);

export default router;
