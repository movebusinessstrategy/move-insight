import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../db/client.js';
import { criarContaPagar, listarContasPagar, obterContaPagarPorId, marcarComoPago, deletarContaPagar } from '../contas-pagar.service.js';
import { criarFornecedor } from '../fornecedores.service.js';
import { randomUUID } from 'node:crypto';

describe('Contas Pagar Service', () => {
  const adminId = randomUUID();
  let fornecedorId: string;
  let contaId: string;

  beforeAll(async () => {
    // Insert test admin
    await db`
      INSERT INTO users (id, nome, email, senha_hash, role, ativo)
      VALUES (${adminId}, 'Test Admin', ${'test-contaspagar-' + adminId + '@example.com'}, 'hash', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create test supplier
    const fornecedor = await criarFornecedor(adminId, {
      nome: 'Test Supplier for Bills',
    });
    fornecedorId = fornecedor.id;
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM contas_pagar WHERE admin_id = ${adminId}`;
    await db`DELETE FROM fornecedores WHERE admin_id = ${adminId}`;
    await db`DELETE FROM users WHERE id = ${adminId}`;
  });

  it('should create a bill', async () => {
    const conta = await criarContaPagar(adminId, {
      fornecedor_id: fornecedorId,
      descricao: 'Serviço de consultoria',
      valor: 1500.50,
      data_vencimento: '2026-06-30',
      categoria: 'Serviços',
    });

    expect(conta.id).toBeDefined();
    expect(conta.descricao).toBe('Serviço de consultoria');
    expect(conta.valor).toBe('1500.50');
    expect(conta.status).toBe('pendente');
    
    contaId = conta.id;
  });

  it('should list bills', async () => {
    const contas = await listarContasPagar(adminId);
    
    expect(Array.isArray(contas)).toBe(true);
    expect(contas.length).toBeGreaterThan(0);
  });

  it('should get bill by id', async () => {
    const conta = await obterContaPagarPorId(contaId, adminId);
    
    expect(conta).toBeDefined();
    expect(conta?.id).toBe(contaId);
    expect(conta?.status).toBe('pendente');
  });

  it('should mark bill as paid', async () => {
    const updated = await marcarComoPago(contaId, adminId);
    
    expect(updated?.status).toBe('pago');
    expect(updated?.data_pagamento).toBeDefined();
  });

  it('should delete bill', async () => {
    await deletarContaPagar(contaId, adminId);
    
    const conta = await obterContaPagarPorId(contaId, adminId);
    expect(conta).toBeNull();
  });
});
