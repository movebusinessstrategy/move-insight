import { Router } from 'express';
import { handleAdminLogin, handleAdminLogout } from '../modules/auth/admin.controller.js';
import { requireAdminAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/login', handleAdminLogin);
router.post('/logout', requireAdminAuth, handleAdminLogout);

export default router;
