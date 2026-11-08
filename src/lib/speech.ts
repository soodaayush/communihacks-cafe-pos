// Client-only. Reads text aloud. The voice is ElevenLabs (via POST /api/speak, which keeps the API
// key on the server); if that is not set up or fails, the browser's built-in voice reads it instead.

/**
 * Converts money formats (e.g. "$4.50", "$2", "$1,326.00") and dollar symbols
 * into clear natural English words for speech synthesis.
 * E.g., "$4.50" -> "four dollars and fifty cents", "$2" -> "two dollars".
 */
export function speakableText(text: string): string {
  // Replace dollar amounts like $1,326.50 or $4.50 or $5
  return text
    .replace(/\$(\d+(?:,\d{3})*)\.(\d{2})\b/g, (_match, dollars, cents) => {
      const dNum = parseInt(dollars.replace(/,/g, ""), 10);
      const cNum = parseInt(cents, 10);
      const dWord = dNum === 1 ? "1 dollar" : `${dNum} dollars`;
      if (cNum === 0) return dWord;
      const cWord = cNum === 1 ? "1 cent" : `${cNum} cents`;
      return `${dWord} and ${cWord}`;
    })
    .replace(/\$(\d+(?:,\d{3})*)\b/g, (_match, dollars) => {
      const dNum = parseInt(dollars.replace(/,/g, ""), 10);
      return dNum === 1 ? "1 dollar" : `${dNum} dollars`;
    })
    .replace(/(\d+)\s*¢/g, (_match, cents) => {
      const cNum = parseInt(cents, 10);
      return cNum === 1 ? "1 cent" : `${cNum} cents`;
    })
    .replace(/\s*−\s*/g, " minus ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/\s*×\s*/g, " times ");
}

export type SpeakState = "idle" | "loading" | "playing";

// A silent, empty sound. See unlockAudio().
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const URL_CACHE_MAX = 100;

let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let token = 0; // every new request bumps this: an older one that is still loading is ignored
let cancelCurrent: (() => void) | null = null;
const urlCache = new Map<string, string>(); // sentence -> audio already fetched this session
const pending = new Map<string, Promise<string | null>>();

/**
 * Browsers only allow sound that starts from a tap, and the ElevenLabs audio arrives a moment
 * after the tap. So the first tap plays a silent sound straight away: that "unlocks" the audio
 * player for the rest of the session (iPad Safari needs this).
 */
function unlockAudio() {
  if (!audioEl) audioEl = new Audio();
  if (unlocked) return;
  unlocked = true;
  audioEl.src = SILENT_WAV;
  audioEl.play().catch(() => {
    unlocked = false;
  });
}

/** The ElevenLabs audio for a sentence, or null if the server says to use the browser's voice. */
function fetchAudioUrl(text: string): Promise<string | null> {
  const cached = urlCache.get(text);
  if (cached) return Promise.resolve(cached);
  let request = pending.get(text);
  if (!request) {
    request = fetch("/api/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) return null;
        const url = URL.createObjectURL(await res.blob());
        if (urlCache.size >= URL_CACHE_MAX) {
          const oldest = urlCache.keys().next().value!;
          URL.revokeObjectURL(urlCache.get(oldest)!);
          urlCache.delete(oldest);
        }
        urlCache.set(text, url);
        return url;
      })
      .catch(() => null)
      .finally(() => pending.delete(text));
    pending.set(text, request);
  }
  return request;
}

function browserSpeak(text: string, onEnd: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(speakableText(text));
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  // Choose an English voice if available
  const preferred = window.speechSynthesis
    .getVoices()
    .find(
      (v) => v.lang.startsWith("en-CA") || v.lang.startsWith("en-US") || v.lang.startsWith("en"),
    );
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
  return true;
}

/** Stops whatever is being read. The button that started it goes back to idle. */
export function stopSpeaking(): void {
  cancelCurrent?.();
}

/**
 * Reads `text` aloud. Call it straight from a tap. `onState` follows it: loading (waiting for the
 * voice), playing, idle (done or stopped). A new call stops the one before it.
 */
export function speak(text: string, onState?: (state: SpeakState) => void): void {
  if (typeof window === "undefined") return;
  stopSpeaking();
  const mine = ++token;
  const set = (state: SpeakState) => {
    if (mine === token) onState?.(state);
  };
  cancelCurrent = () => {
    token++; // anything still loading for this request is now ignored
    audioEl?.pause();
    window.speechSynthesis?.cancel();
    cancelCurrent = null;
    onState?.("idle");
  };
  const finished = () => {
    if (mine !== token) return;
    cancelCurrent = null;
    onState?.("idle");
  };

  unlockAudio();
  window.speechSynthesis?.cancel();
  set("loading");

  void (async () => {
    const url = await fetchAudioUrl(text);
    if (mine !== token) return;
    if (url && audioEl) {
      audioEl.src = url;
      audioEl.onended = finished;
      audioEl.onerror = () => {
        if (mine === token && !browserSpeak(text, finished)) finished();
      };
      try {
        await audioEl.play();
        set("playing");
        return;
      } catch {
        // The browser blocked the sound: fall through to the browser's own voice.
      }
    }
    if (mine !== token) return;
    set("playing");
    if (!browserSpeak(text, finished)) finished();
  })();
}
