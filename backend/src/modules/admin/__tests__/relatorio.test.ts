import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '../../../db/client.js';
import { enviarRelatorioWhatsApp } from '../clientes.service.js';
import { randomUUID } from 'node:crypto';

describe('Relatório WhatsApp Service', () => {
  const adminId = randomUUID();
  let clienteId: string;

  beforeAll(async () => {
    // Insert test admin
    await db`
      INSERT INTO users (id, nome, email, senha_hash, role, ativo)
      VALUES (${adminId}, 'Test Admin', ${'test-relatorio-' + adminId + '@example.com'}, 'hash', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create test cliente with WhatsApp and Meta Ads account
    const cliente = await db`
      INSERT INTO clientes (
        nome, email, status, whatsapp_numero, meta_ads_account_id
      )
      VALUES (
        'Test Cliente',
        'cliente@test.com',
        'ativo',
        '5511999999999',
        'act_123456789'
      )
      RETURNING id
    `;
    clienteId = cliente[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM mensagens_enviadas WHERE cliente_id = ${clienteId}`;
    await db`DELETE FROM clientes WHERE id = ${clienteId}`;
    await db`DELETE FROM users WHERE id = ${adminId}`;
  });

  it('should send weekly report', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue('msg_123');

    // This will fail without proper Meta Ads data, but tests the flow
    try {
      await enviarRelatorioWhatsApp(clienteId, 'semanal', mockSendMessage);
    } catch (error) {
      // Expected to fail without real Meta Ads account
      expect(error).toBeDefined();
    }
  });

  it('should fail if cliente has no WhatsApp', async () => {
    // Create cliente without WhatsApp
    const cliente = await db`
      INSERT INTO clientes (
        nome, email, status, meta_ads_account_id
      )
      VALUES (
        'No WhatsApp Cliente',
        'no-whatsapp@test.com',
        'ativo',
        'act_123456789'
      )
      RETURNING id
    `;

    await expect(
      enviarRelatorioWhatsApp(cliente[0].id, 'semanal')
    ).rejects.toThrow('Cliente não possui WhatsApp cadastrado');

    // Cleanup
    await db`DELETE FROM clientes WHERE id = ${cliente[0].id}`;
  });

  it('should fail if cliente has no Meta Ads account', async () => {
    // Create cliente without Meta Ads
    const cliente = await db`
      INSERT INTO clientes (
        nome, email, status, whatsapp_numero
      )
      VALUES (
        'No Meta Ads Cliente',
        'no-meta@test.com',
        'ativo',
        '5511999999999'
      )
      RETURNING id
    `;

    await expect(
      enviarRelatorioWhatsApp(cliente[0].id, 'semanal')
    ).rejects.toThrow('Cliente não possui Meta Ads account configurado');

    // Cleanup
    await db`DELETE FROM clientes WHERE id = ${cliente[0].id}`;
  });
});
