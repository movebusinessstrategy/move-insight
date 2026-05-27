import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../db/client.js';
import { criarFornecedor, listarFornecedores, obterFornecedorPorId, atualizarFornecedor, deletarFornecedor } from '../fornecedores.service.js';
import { randomUUID } from 'node:crypto';

describe('Fornecedores Service', () => {
  const adminId = randomUUID();
  let fornecedorId: string;

  beforeAll(async () => {
    // Insert test admin
    await db`
      INSERT INTO users (id, nome, email, senha_hash, role, ativo)
      VALUES (${adminId}, 'Test Admin', ${'test-fornecedores-' + adminId + '@example.com'}, 'hash', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `;
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM fornecedores WHERE admin_id = ${adminId}`;
    await db`DELETE FROM users WHERE id = ${adminId}`;
  });

  it('should create a supplier', async () => {
    const fornecedor = await criarFornecedor(adminId, {
      nome: 'Test Supplier',
      email: 'supplier@test.com',
      telefone: '1234567890',
      categoria: 'Serviços',
    });

    expect(fornecedor.id).toBeDefined();
    expect(fornecedor.nome).toBe('Test Supplier');
    expect(fornecedor.email).toBe('supplier@test.com');
    expect(fornecedor.admin_id).toBe(adminId);
    
    fornecedorId = fornecedor.id;
  });

  it('should list suppliers', async () => {
    const fornecedores = await listarFornecedores(adminId);
    
    expect(Array.isArray(fornecedores)).toBe(true);
    expect(fornecedores.length).toBeGreaterThan(0);
    expect(fornecedores[0].admin_id).toBe(adminId);
  });

  it('should get supplier by id', async () => {
    const fornecedor = await obterFornecedorPorId(fornecedorId, adminId);
    
    expect(fornecedor).toBeDefined();
    expect(fornecedor?.id).toBe(fornecedorId);
    expect(fornecedor?.nome).toBe('Test Supplier');
  });

  it('should update supplier', async () => {
    const updated = await atualizarFornecedor(fornecedorId, adminId, {
      email: 'updated@test.com',
      categoria: 'Produtos',
    });

    expect(updated?.email).toBe('updated@test.com');
    expect(updated?.categoria).toBe('Produtos');
  });

  it('should delete supplier', async () => {
    await deletarFornecedor(fornecedorId, adminId);
    
    const fornecedor = await obterFornecedorPorId(fornecedorId, adminId);
    expect(fornecedor).toBeNull();
  });
});
