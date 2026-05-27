import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../db/client.js';
import { criarReceitaEsporadica, listarReceitasEsporadicas, obterReceitaEsporadicaPorId, marcarComoRecebida, deletarReceitaEsporadica } from '../receitas-esporadicas.service.js';
import { randomUUID } from 'node:crypto';

describe('Receitas Esporádicas Service', () => {
  const adminId = randomUUID();
  let clienteId: string;
  let receitaId: string;

  beforeAll(async () => {
    // Insert test admin
    await db`
      INSERT INTO users (id, nome, email, senha_hash, role, ativo)
      VALUES (${adminId}, 'Test Admin', ${'test-receitas-' + adminId + '@example.com'}, 'hash', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create test cliente
    const cliente = await db`
      INSERT INTO clientes (nome, email, status)
      VALUES ('Test Cliente', 'cliente@test.com', 'ativo')
      RETURNING id
    `;
    clienteId = cliente[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM receitas_esporadicas WHERE admin_id = ${adminId}`;
    await db`DELETE FROM clientes WHERE id = ${clienteId}`;
    await db`DELETE FROM users WHERE id = ${adminId}`;
  });

  it('should create sporadic revenue', async () => {
    const receita = await criarReceitaEsporadica(adminId, {
      cliente_id: clienteId,
      descricao: 'Consultoria extra',
      valor: 2000.00,
      data_receita: '2026-05-25',
      tipo: 'consultoria',
    });

    expect(receita.id).toBeDefined();
    expect(receita.descricao).toBe('Consultoria extra');
    expect(receita.valor).toBe('2000.00');
    expect(receita.status).toBe('pendente');
    
    receitaId = receita.id;
  });

  it('should list sporadic revenues', async () => {
    const receitas = await listarReceitasEsporadicas(adminId);
    
    expect(Array.isArray(receitas)).toBe(true);
    expect(receitas.length).toBeGreaterThan(0);
  });

  it('should get revenue by id', async () => {
    const receita = await obterReceitaEsporadicaPorId(receitaId, adminId);
    
    expect(receita).toBeDefined();
    expect(receita?.id).toBe(receitaId);
    expect(receita?.status).toBe('pendente');
  });

  it('should mark revenue as received', async () => {
    const updated = await marcarComoRecebida(receitaId, adminId);
    
    expect(updated?.status).toBe('recebido');
  });

  it('should delete revenue', async () => {
    await deletarReceitaEsporadica(receitaId, adminId);
    
    const receita = await obterReceitaEsporadicaPorId(receitaId, adminId);
    expect(receita).toBeNull();
  });
});
