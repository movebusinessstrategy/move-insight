import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../db/client.js';
import { obterResumoFinanceiro } from '../financeiro.service.js';
import { criarFornecedor } from '../fornecedores.service.js';
import { criarContaPagar } from '../contas-pagar.service.js';
import { criarReceitaEsporadica } from '../receitas-esporadicas.service.js';
import { randomUUID } from 'node:crypto';

describe('Financeiro Service', () => {
  const adminId = randomUUID();
  let fornecedorId: string;
  let clienteId: string;

  beforeAll(async () => {
    // Insert test admin
    await db`
      INSERT INTO users (id, nome, email, senha_hash, role, ativo)
      VALUES (${adminId}, 'Test Admin', ${'test-financeiro-' + adminId + '@example.com'}, 'hash', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create test supplier
    const fornecedor = await criarFornecedor(adminId, {
      nome: 'Test Supplier',
    });
    fornecedorId = fornecedor.id;

    // Create test cliente
    const cliente = await db`
      INSERT INTO clientes (nome, email, status)
      VALUES ('Test Cliente', 'cliente@test.com', 'ativo')
      RETURNING id
    `;
    clienteId = cliente[0].id;

    // Create test bills
    await criarContaPagar(adminId, {
      fornecedor_id: fornecedorId,
      descricao: 'Conta 1',
      valor: 500.00,
      data_vencimento: '2026-06-30',
    });

    // Create test revenue (mark as received)
    const receita = await criarReceitaEsporadica(adminId, {
      cliente_id: clienteId,
      descricao: 'Receita 1',
      valor: 1000.00,
      data_receita: '2026-05-25',
    });

    // Mark it as received so it counts in the financial summary
    await db`
      UPDATE receitas_esporadicas
      SET status = 'recebido'
      WHERE id = ${receita.id}
    `;
  });

  afterAll(async () => {
    // Cleanup
    await db`DELETE FROM contas_pagar WHERE admin_id = ${adminId}`;
    await db`DELETE FROM receitas_esporadicas WHERE admin_id = ${adminId}`;
    await db`DELETE FROM fornecedores WHERE admin_id = ${adminId}`;
    await db`DELETE FROM clientes WHERE id = ${clienteId}`;
    await db`DELETE FROM users WHERE id = ${adminId}`;
  });

  it('should get financial summary', async () => {
    const resumo = await obterResumoFinanceiro(adminId);

    expect(resumo).toBeDefined();
    expect(resumo.receita).toBeDefined();
    expect(resumo.despesa).toBeDefined();
    expect(resumo.saldo).toBeDefined();
    expect(resumo.proximasContas).toBeInstanceOf(Array);
  });

  it('should have correct totals in summary', async () => {
    const resumo = await obterResumoFinanceiro(adminId);

    expect(resumo.receita.total).toBeGreaterThan(0);
    expect(resumo.despesa.total).toBeGreaterThan(0);
    expect(resumo.saldo).toBe(resumo.receita.total - resumo.despesa.total);
  });
});
