import { Pool, type QueryResultRow } from "pg";

// Tiger Data client (plain Postgres wire protocol). Server-only: never import from a client component.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example)");
  globalForDb.pgPool ??= new Pool({ connectionString, max: 5 });
  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
