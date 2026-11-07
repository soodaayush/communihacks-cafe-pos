import { Pool, type PoolClient, type QueryResultRow } from "pg";

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

/** True when a Tiger Data connection string is configured. Routes fall back to mock data when it is not. */
export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Runs `fn` inside BEGIN/COMMIT on one pooled connection; rolls back if it throws. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
