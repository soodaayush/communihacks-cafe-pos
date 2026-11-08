// Server-only. A simple fixed-window limit, shared by the routes that need one.

/**
 * "At most `max` per minute". Kept on globalThis so a dev-server reload does not reset it.
 * Returns a function: call it before doing the limited thing; false means "too many, wait".
 */
export function perMinuteLimit(name: string, max: number): () => boolean {
  const g = globalThis as unknown as Record<string, { start: number; count: number } | undefined>;
  const key = `rateLimit_${name}`;
  return () => {
    const w = (g[key] ??= { start: 0, count: 0 });
    const now = Date.now();
    if (now - w.start > 60_000) {
      w.start = now;
      w.count = 0;
    }
    return ++w.count <= max;
  };
}
