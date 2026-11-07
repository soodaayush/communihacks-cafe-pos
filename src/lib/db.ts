import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Tiger Data client (plain Postgres wire protocol). Server-only: never import from a client component.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      connectionString,
      max: 5,
      // The server drops idle connections; close ours first so we never reuse a dead one.
      idleTimeoutMillis: 10_000,
      keepAlive: true,
      // Fail fast instead of leaving a page hanging when the database can't be reached.
      connectionTimeoutMillis: 10_000,
    });
    // An idle connection that dies emits an error on the pool; without a handler it crashes the server.
    globalForDb.pgPool.on("error", (err) =>
      console.warn("[db] idle connection closed:", err.message),
    );
  }
  return globalForDb.pgPool;
}

/** The connection broke before the database did anything with our request, so trying again is safe. */
function isDroppedConnection(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  return (
    /Connection terminated|connection timeout|ECONNRESET|EPIPE/i.test(e?.message ?? "") ||
    e?.code === "ECONNRESET" ||
    e?.code === "57P01" // admin_shutdown: the server closed this connection
  );
}

/** Read-only queries. Retried once on a dropped connection (every caller only reads). */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  try {
    return (await getPool().query<T>(text, params)).rows;
  } catch (err) {
    if (!isDroppedConnection(err)) throw err;
    return (await getPool().query<T>(text, params)).rows;
  }
}

/**
 * True when the app should read from Tiger Data. While developing without DATABASE_URL, routes fall
 * back to mock data. In production there is no fallback: a missing DATABASE_URL is an error, so a
 * live deployment can never quietly show hard-coded numbers.
 */
export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV === "production";
}

/**
 * Runs `fn` inside BEGIN/COMMIT on one pooled connection; rolls back if it throws.
 * If the connection is already dead at BEGIN (nothing written yet), retries once on a fresh one.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
    } catch (err) {
      client.release(err as Error); // drop the broken connection from the pool
      if (attempt === 0 && isDroppedConnection(err)) continue;
      throw err;
    }
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      client.release();
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      client.release(isDroppedConnection(err) ? (err as Error) : undefined);
      throw err;
    }
  }
}
