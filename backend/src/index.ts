import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import authAdminRoutes from './routes/auth.admin.js';
import authClienteRoutes from './routes/auth.cliente.js';
import adminClientesRoutes from './routes/admin.clientes.js';
import adminFaturasRoutes from './routes/admin.faturas.js';
import { initializeWhatsApp, sendWhatsAppMessage } from './services/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

// Middleware
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));
app.use((_req: any, _res, next) => {
  _req.sendWhatsAppMessage = sendWhatsAppMessage;
  next();
});

// CORS
app.use((_req: any, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ADMIN_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Routes
app.use('/api/auth/admin', authAdminRoutes);
app.use('/api/cliente/auth', authClienteRoutes);
app.use('/api/admin', adminClientesRoutes);
app.use('/api/admin', adminFaturasRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, async () => {
  console.log('🚀 MOVE Insights API started');
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server running on http://localhost:${PORT}`);
  console.log(`✅ Auth endpoints ready at /api/auth/admin/* and /api/cliente/auth/*`);

  // Inicializar WhatsApp em background
  console.log('📱 Inicializando WhatsApp Web...');
  initializeWhatsApp().catch((error) => {
    console.error('⚠️ WhatsApp não foi inicializado (lembretes não funcionarão):', error);
  });
});
