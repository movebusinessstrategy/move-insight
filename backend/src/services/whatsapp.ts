import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let whatsappClient: Client | null = null;
let isInitializing = false;

export async function initializeWhatsApp(): Promise<Client | null> {
  if (whatsappClient?.info?.wid) {
    return whatsappClient;
  }

  if (isInitializing) {
    return null;
  }

  try {
    isInitializing = true;

    const client = new Client({
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    } as any);

    client.on('qr', (qr) => {
      console.log('\n📱 QR Code gerado (escaneie com seu celular):');
      qrcode.generate(qr, { small: true });
      console.log('\n');
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado com sucesso!');
    });

    client.on('auth_failure', () => {
      console.log('❌ Falha na autenticação do WhatsApp');
    });

    client.on('ready', () => {
      console.log('🚀 WhatsApp pronto para enviar mensagens');
    });

    await client.initialize();
    whatsappClient = client;
    isInitializing = false;
    return client;
  } catch (error) {
    console.error('❌ Erro ao inicializar WhatsApp:', error);
    isInitializing = false;
    return null;
  }
}

export async function sendWhatsAppMessage(numero: string, mensagem: string): Promise<string | null> {
  try {
    const client = whatsappClient || (await initializeWhatsApp());

    if (!client?.info?.wid) {
      console.warn('⚠️ WhatsApp não está conectado');
      return null;
    }

    // Formatar número (remover caracteres especiais, adicionar país se necessário)
    const numeroFormatado = numero.replace(/\D/g, '');
    const chatId = numeroFormatado.includes('55')
      ? `${numeroFormatado}@c.us`
      : `55${numeroFormatado}@c.us`;

    const response = await client.sendMessage(chatId, mensagem);
    return response?.id?._serialized || (response?.id as any)?.toString() || 'enviado';
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
    return null;
  }
}

export function getWhatsAppClient(): Client | null {
  return whatsappClient;
}
