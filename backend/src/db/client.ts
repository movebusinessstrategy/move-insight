import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://movedev:movesecret123@localhost:5432/move_insights';

const sql = postgres(databaseUrl);

export const db = sql;
