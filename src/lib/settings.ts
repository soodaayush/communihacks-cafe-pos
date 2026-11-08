// Server-only. The few things the café can change itself, kept in Tiger Data's settings table
// (key -> JSON value). Without a database they live in memory, so the mock demo still works.
import { hasDb, query, withTransaction } from "./db";

const g = globalThis as unknown as { mockSettings?: Map<string, unknown> };
const mock = (g.mockSettings ??= new Map());

export async function getSetting<T>(key: string): Promise<T | null> {
  if (!hasDb()) return (mock.get(key) as T) ?? null;
  try {
    const rows = await query<{ value: T }>(`SELECT value FROM settings WHERE key = $1`, [key]);
    return rows[0]?.value ?? null;
  } catch (err) {
    // A database set up before the settings table existed: use the default until db:schema runs.
    if ((err as { code?: string }).code === "42P01") return null;
    throw err;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<T> {
  if (!hasDb()) {
    mock.set(key, value);
    return value;
  }
  await withTransaction((client) =>
    client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)],
    ),
  );
  return value;
}

/** "On the 1st of `month` the café had `cents`." Every other month's balance is worked out from it. */
export interface OpeningBalance {
  month: string; // YYYY-MM
  cents: number;
}
export const OPENING_BALANCE = "opening_balance";
