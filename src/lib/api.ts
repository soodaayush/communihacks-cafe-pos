import { hasDb } from "./db";

// Shared helpers for route handlers.

/** Run the real query when DATABASE_URL is set, otherwise return mock data (so `npm run dev` works with no setup). */
export async function dbOrMock<T>(
  mock: () => T,
  real: () => Promise<T>,
  status = 200,
): Promise<Response> {
  if (!hasDb()) return Response.json(mock(), { status });
  try {
    return Response.json(await real(), { status });
  } catch (err) {
    if (err instanceof HttpError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

/** Throw inside a handler to send a specific 4xx back to the client. */
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isPositiveInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
export const isCents = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body))
      return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError("Body must be a JSON object");
}

/** A stock count: a whole number from 0 to 99,999. */
export const isCount = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 99_999;
