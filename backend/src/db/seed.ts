import bcrypt from 'bcryptjs';
import { db } from './client.js';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    const email = process.env.SEED_ADMIN_EMAIL || 'contato@movebusiness.com.br';
    const password = process.env.SEED_ADMIN_PASSWORD || 'mudar-no-primeiro-login';
    const nome = process.env.SEED_ADMIN_NOME || 'Lucas Macena';

    const senhaHash = await bcrypt.hash(password, 10);

    await db`
      INSERT INTO users (nome, email, senha_hash, role, ativo)
      VALUES (${nome}, ${email}, ${senhaHash}, ${'admin'}, ${true})
      ON CONFLICT (email) DO NOTHING
    `;

    console.log(`✅ Seed completed: admin user ${email}`);
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await db.end();
    process.exit(1);
  }
}

seed();
