// Client-only. Records a short clip from the microphone for voice ordering.

export interface Recording {
  /** Stop and get the clip. The microphone is released. */
  stop: () => Promise<Blob>;
  /** Throw the clip away and release the microphone. */
  cancel: () => void;
}

/** True when this browser can record (needs a secure page: https, or localhost). */
export const canRecord = (): boolean =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== "undefined";

/**
 * Asks for the microphone and starts recording. Stops by itself after `maxMs` and calls `onAutoStop`
 * (then `stop()` still returns the clip). Rejects if the microphone is blocked.
 */
export async function startRecording(maxMs: number, onAutoStop?: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  // Chrome and Firefox record webm; Safari records mp4. 32 kbps is plenty for speech.
  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, {
    ...(mimeType && { mimeType }),
    audioBitsPerSecond: 32_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
  });
  const release = () => stream.getTracks().forEach((t) => t.stop());
  recorder.start();

  const timer = setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
    onAutoStop?.();
  }, maxMs);

  return {
    stop: () => {
      clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
      return finished.finally(release);
    },
    cancel: () => {
      clearTimeout(timer);
      chunks.length = 0;
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}
