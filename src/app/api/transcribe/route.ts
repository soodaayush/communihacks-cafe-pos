import { ELEVENLABS_BASE, elevenKey, perMinuteLimit } from "@/lib/elevenlabs";

// POST /api/transcribe  (multipart form: `audio` = a short recording)  ->  { text }
// Sends the recording to ElevenLabs speech-to-text (Scribe) and returns what was said. The register
// turns that text into order lines (src/lib/voice-order.ts). The key stays on the server.
//
// Errors the page understands:  503 voice_unavailable (no key, or the key may not use speech-to-text), 429 too_many,
// 502 transcription_failed (ElevenLabs refused or could not be reached), 400/413 bad recording.

const MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";
// An order is short English. Naming the language makes it quicker and avoids a wrong guess.
const LANGUAGE = process.env.ELEVENLABS_STT_LANGUAGE || "en";
const MAX_BYTES = 2_000_000; // about a minute; the page stops recording after 12 seconds
const withinLimit = perMinuteLimit("stt", Number(process.env.ELEVENLABS_STT_MAX_PER_MINUTE) || 30);

export async function POST(request: Request) {
  const key = elevenKey();
  if (!key) return Response.json({ error: "voice_unavailable" }, { status: 503 });

  const audio = await request
    .formData()
    .then((form) => form.get("audio"))
    .catch(() => null);
  if (!(audio instanceof File) || audio.size === 0)
    return Response.json({ error: "audio is missing" }, { status: 400 });
  if (!/^(audio|video)\//.test(audio.type))
    return Response.json({ error: "audio must be an audio recording" }, { status: 400 });
  if (audio.size > MAX_BYTES)
    return Response.json({ error: "recording is too long" }, { status: 413 });
  if (!withinLimit()) return Response.json({ error: "too_many" }, { status: 429 });

  const upstream = new FormData();
  upstream.set("model_id", MODEL);
  upstream.set("language_code", LANGUAGE);
  upstream.set("tag_audio_events", "false");
  upstream.set("file", audio, audio.name || "order.webm");

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/v1/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": key },
      body: upstream,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      // 401 = bad key or the key lacks the speech_to_text permission; 402/429 = credits or rate.
      console.warn(
        `[transcribe] ElevenLabs answered ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
      // A refused key is a setup problem, not a bad recording: the page says so.
      if (res.status === 401 || res.status === 403)
        return Response.json({ error: "voice_unavailable" }, { status: 503 });
      return Response.json({ error: "transcription_failed" }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    return Response.json({ text: String(data.text ?? "").trim() });
  } catch (err) {
    console.warn(
      "[transcribe] ElevenLabs could not be reached:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "transcription_failed" }, { status: 502 });
  }
}
