// Server-only. Shared by the ElevenLabs routes (/api/speak, /api/transcribe). The API key lives in
// ELEVENLABS_API_KEY on the server and is never sent to the browser.

/** Regional hosts also work (see ElevenLabs docs); tests point this at a stand-in server. */
export const ELEVENLABS_BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";

export const elevenKey = (): string | undefined => process.env.ELEVENLABS_API_KEY || undefined;

/**
 * "At most `max` per minute", to protect the monthly credits. Kept on globalThis so a dev-server
 * reload does not reset it. Returns a function: call it before spending credits.
 */
export function perMinuteLimit(name: string, max: number): () => boolean {
  const g = globalThis as unknown as Record<string, { start: number; count: number } | undefined>;
  const key = `elevenLimit_${name}`;
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
