import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { db } from './client.js';

const migrationsDir = join(process.cwd(), 'src', 'db', 'migrations');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    const files = await readdir(migrationsDir);
    const migrations = files
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrations) {
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf-8');

      console.log(`📝 Running: ${file}`);
      await db.unsafe(sql);
      console.log(`✅ Completed: ${file}`);
    }

    console.log('✨ All migrations completed successfully');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await db.end();
    process.exit(1);
  }
}

runMigrations();
