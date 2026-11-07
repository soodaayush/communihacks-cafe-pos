import { createHash } from "node:crypto";
import { speakableText } from "@/lib/speech";
import type { SpeakRequest, SpeakResponse } from "@/lib/types";

// POST /api/speak  { text }
//   -> audio (ElevenLabs text-to-speech) when ELEVENLABS_API_KEY is set and the call works
//   -> JSON { engine: "browser", text } otherwise, and the page reads the text with the browser's voice
//
// The API key stays on the server: the browser only ever sees this route. To protect the monthly
// credits, the audio for a given sentence is made once and reused (cache), a sentence can only be so
// long, and only so many new sentences can be sent per minute.

const BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io"; // regional hosts also work
const VOICE = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5"; // fast, and half the credits of v2
const MAX_CHARS = 1000;
const MAX_NEW_PER_MINUTE = Number(process.env.ELEVENLABS_MAX_PER_MINUTE) || 60;
const CACHE_ENTRIES = 300;

interface Audio {
  bytes: ArrayBuffer;
  type: string;
}
// Kept on globalThis so a dev-server reload does not throw the cache (and your credits) away.
const g = globalThis as unknown as {
  speakCache?: Map<string, Audio>;
  speakInflight?: Map<string, Promise<Audio | null>>;
  speakWindow?: { start: number; count: number };
};
const cache = (g.speakCache ??= new Map());
const inflight = (g.speakInflight ??= new Map());
const windowState = (g.speakWindow ??= { start: 0, count: 0 });

function withinRateLimit(): boolean {
  const now = Date.now();
  if (now - windowState.start > 60_000) {
    windowState.start = now;
    windowState.count = 0;
  }
  return ++windowState.count <= MAX_NEW_PER_MINUTE;
}

async function fromElevenLabs(text: string, apiKey: string): Promise<Audio | null> {
  try {
    const res = await fetch(`${BASE}/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        // A touch slower than normal: clearer for a cashier and a customer to follow.
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.95 },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // 401 = bad key, 402/429 = out of credits or too many requests. Never log the key.
      console.warn(
        `[speak] ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
      return null;
    }
    return {
      bytes: await res.arrayBuffer(),
      type: res.headers.get("content-type") ?? "audio/mpeg",
    };
  } catch (err) {
    console.warn(
      "[speak] ElevenLabs could not be reached:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function POST(request: Request) {
  const { text = "" } = (await request.json().catch(() => ({}))) as Partial<SpeakRequest>;
  const spoken = speakableText(String(text)).trim();
  if (!spoken) return Response.json({ error: "text is empty" }, { status: 400 });
  if (spoken.length > MAX_CHARS)
    return Response.json(
      { error: `text must be at most ${MAX_CHARS} characters` },
      { status: 400 },
    );

  const browserFallback = () =>
    Response.json({ engine: "browser", text: spoken } satisfies SpeakResponse);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return browserFallback();

  const key = createHash("sha1").update(`${MODEL}|${VOICE}|${spoken}`).digest("hex");
  let audio = cache.get(key);
  if (!audio) {
    // Two taps on the same speaker at once share one ElevenLabs call.
    let pending = inflight.get(key);
    if (!pending) {
      if (!withinRateLimit()) return browserFallback();
      pending = fromElevenLabs(spoken, apiKey).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    audio = (await pending) ?? undefined;
    if (!audio) return browserFallback();
    if (cache.size >= CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(key, audio);
  }

  return new Response(audio.bytes, {
    headers: {
      "content-type": audio.type,
      "cache-control": "private, max-age=86400",
      "x-speech-engine": "elevenlabs",
    },
  });
}
