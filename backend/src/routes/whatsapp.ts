import { Router } from 'express';
import { initializeWhatsApp, getCurrentQrCode, getWhatsAppStatus, disconnectWhatsApp } from '../services/whatsapp.js';
import { requireAdminAuth } from '../middlewares/auth.js';
import QRCode from 'qrcode';

const router = Router();

router.get('/status', requireAdminAuth, (_req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao obter status';
    res.status(500).json({ error: message });
  }
});

router.get('/qr', requireAdminAuth, async (_req, res): Promise<void> => {
  try {
    const qrCode = getCurrentQrCode();

    if (!qrCode) {
      res.status(404).json({ error: 'Nenhum QR code disponível' });
      return;
    }

    const qrImage = await QRCode.toDataURL(qrCode, {
      width: 300,
      margin: 1,
    });

    res.json({ qr: qrImage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar QR code';
    res.status(500).json({ error: message });
  }
});

router.post('/connect', requireAdminAuth, async (_req, res): Promise<void> => {
  try {
    const client = await initializeWhatsApp();

    if (!client) {
      res.status(500).json({ error: 'Erro ao inicializar WhatsApp' });
      return;
    }

    res.json({ message: 'Iniciando conexão... escaneie o QR code' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao conectar';
    res.status(500).json({ error: message });
  }
});

router.post('/disconnect', requireAdminAuth, async (_req, res) => {
  try {
    await disconnectWhatsApp();
    res.json({ message: 'WhatsApp desconectado com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao desconectar';
    res.status(500).json({ error: message });
  }
});

export default router;
