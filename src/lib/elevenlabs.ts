// Server-only. Shared by the ElevenLabs routes (/api/speak). The API key lives in
// ELEVENLABS_API_KEY on the server and is never sent to the browser.

/** Regional hosts also work (see ElevenLabs docs); tests point this at a stand-in server. */
export const ELEVENLABS_BASE = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";
