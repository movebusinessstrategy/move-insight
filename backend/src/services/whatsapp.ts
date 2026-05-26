import { Client } from 'whatsapp-web.js';

let whatsappClient: Client | null = null;
let isInitializing = false;
let currentQrCode: string | null = null;

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
      currentQrCode = qr;
    });

    client.on('authenticated', () => {
      // Autenticado
    });

    client.on('auth_failure', () => {
      // Falha na autenticação
    });

    client.on('ready', () => {
      // Pronto para enviar mensagens
    });

    await client.initialize();
    whatsappClient = client;
    isInitializing = false;
    return client;
  } catch (error) {
    isInitializing = false;
    return null;
  }
}

export async function sendWhatsAppMessage(numero: string, mensagem: string): Promise<string | null> {
  try {
    const client = whatsappClient || (await initializeWhatsApp());

    if (!client?.info?.wid) {
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
    return null;
  }
}

export function getWhatsAppClient(): Client | null {
  return whatsappClient;
}

export function getCurrentQrCode(): string | null {
  return currentQrCode;
}

export function getWhatsAppStatus(): { connected: boolean; qrPending: boolean } {
  return {
    connected: !!whatsappClient?.info?.wid,
    qrPending: !!currentQrCode,
  };
}

export async function disconnectWhatsApp(): Promise<void> {
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      whatsappClient = null;
      currentQrCode = null;
    } catch (error) {
    }
  }
}
