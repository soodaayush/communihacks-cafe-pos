// The app's sounds, built from a few soft notes (Web Audio). No files and no network: they play the
// instant you tap. The rules that keep them pleasant, not annoying:
//   - short: the everyday ones are about a tenth of a second
//   - soft: a quick fade in and a smooth fade out, so there is never a click
//   - quiet and round: sine and triangle waves only, nothing harsh or high
//   - meaningful: up for adding, down for removing, a happy two-note chime for "done",
//     a cash register bell for a sale, two gentle falling notes for a problem
// Works with a live AudioContext and with an OfflineAudioContext (so they can be measured).

/** Overall level. Quiet enough to sit under a conversation, loud enough to notice on a tablet. */
export const MASTER_VOLUME = 0.8;

/**
 * The output every sound goes through: the master volume, then a gentle limiter so a quick run of
 * taps can never get louder or harsher than a single one. Connect sounds to the returned node.
 */
export function createOutput(ctx: BaseAudioContext): GainNode {
  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.08;
  master.connect(limiter).connect(ctx.destination);
  return master;
}

export type SoundName = "add" | "remove" | "tap" | "success" | "sale" | "error" | "mute";
export const SOUND_NAMES: SoundName[] = [
  "add",
  "remove",
  "tap",
  "success",
  "sale",
  "error",
  "mute",
];

interface Note {
  at: number;
  freq: number;
  /** Glide to this pitch over the note (a "pop" or a "drop"). */
  toFreq?: number;
  seconds: number;
  peak: number;
  type?: OscillatorType;
}

/** One soft note: fades in over 6 ms, then fades out smoothly. */
function note(ctx: BaseAudioContext, out: AudioNode, n: Note, pitch: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.freq * pitch, n.at);
  if (n.toFreq)
    osc.frequency.exponentialRampToValueAtTime(n.toFreq * pitch, n.at + n.seconds * 0.8);
  gain.gain.setValueAtTime(0.0001, n.at);
  gain.gain.exponentialRampToValueAtTime(n.peak, n.at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, n.at + n.seconds);
  osc.connect(gain).connect(out);
  osc.start(n.at);
  osc.stop(n.at + n.seconds + 0.02);
}

/** A bell: a pure note plus a quieter, higher, slightly out-of-tune partial, like metal. */
function bell(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  seconds: number,
  peak: number,
  pitch: number,
) {
  note(ctx, out, { at, freq, seconds, peak }, pitch);
  note(ctx, out, { at, freq: freq * 2.76, seconds: seconds * 0.55, peak: peak * 0.22 }, pitch);
}

/** A short soft burst of noise, like a drawer sliding shut. */
function clack(ctx: BaseAudioContext, out: AudioNode, at: number, peak: number) {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1500;
  filter.Q.value = 0.9;
  const gain = ctx.createGain();
  gain.gain.value = peak;
  source.connect(filter).connect(gain).connect(out);
  source.start(at);
}

/**
 * Plays (schedules) one sound. `pitch` nudges it slightly up or down (1 = as designed); the app
 * varies it a little each time so repeated taps do not sound like a machine.
 */
export function scheduleSound(
  ctx: BaseAudioContext,
  out: AudioNode,
  name: SoundName,
  at = ctx.currentTime,
  pitch = 1,
) {
  switch (name) {
    case "add": // a soft bubble that pops upward
      note(ctx, out, { at, freq: 523, toFreq: 784, seconds: 0.11, peak: 0.3 }, pitch);
      note(ctx, out, { at, freq: 1046, toFreq: 1568, seconds: 0.07, peak: 0.06 }, pitch);
      break;
    case "remove": // the same bubble, sinking
      note(ctx, out, { at, freq: 440, toFreq: 277, seconds: 0.12, peak: 0.24 }, pitch);
      break;
    case "tap": // barely there: for opening something
      note(
        ctx,
        out,
        { at, freq: 760, toFreq: 690, seconds: 0.05, peak: 0.12, type: "triangle" },
        pitch,
      );
      break;
    case "success": // two happy notes going up
      note(ctx, out, { at, freq: 659.25, seconds: 0.2, peak: 0.14 }, pitch);
      note(ctx, out, { at: at + 0.09, freq: 987.77, seconds: 0.3, peak: 0.14 }, pitch);
      break;
    case "mute": // "success" in reverse, softer: two notes settling down to quiet
      note(ctx, out, { at, freq: 987.77, seconds: 0.16, peak: 0.1 }, pitch);
      note(
        ctx,
        out,
        { at: at + 0.1, freq: 587.33, toFreq: 523.25, seconds: 0.32, peak: 0.09 },
        pitch,
      );
      break;
    case "sale": // a cash register: drawer, then two bell notes
      clack(ctx, out, at, 0.12);
      bell(ctx, out, at + 0.05, 1318.5, 0.55, 0.11, pitch);
      bell(ctx, out, at + 0.12, 1975.5, 0.75, 0.1, pitch);
      break;
    case "error": // two gentle falling notes, never harsh
      note(ctx, out, { at, freq: 330, seconds: 0.15, peak: 0.12, type: "triangle" }, pitch);
      note(
        ctx,
        out,
        { at: at + 0.13, freq: 262, seconds: 0.24, peak: 0.12, type: "triangle" },
        pitch,
      );
      break;
  }
}

/** Roughly how long a sound lasts, in seconds (for measuring and for tests). */
export const SOUND_SECONDS: Record<SoundName, number> = {
  add: 0.13,
  remove: 0.14,
  tap: 0.06,
  success: 0.41,
  sale: 0.9,
  error: 0.4,
  mute: 0.42,
};
