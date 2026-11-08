"use client";

import { useSyncExternalStore } from "react";
import { createOutput, scheduleSound, type SoundName } from "./sounds-synth";

export type { SoundName } from "./sounds-synth";

// Small sounds on the buttons: a soft pop when something is added, a soft drop when it is removed,
// a chime when something is saved, a cash register when a sale is saved, a gentle tone for a problem.
// They are built in the browser (sounds-synth.ts), so they play instantly with no files. If
// public/sounds has ElevenLabs-made files (npm run sounds), those are used instead.
// Some people are sensitive to noise: there is an on/off switch, remembered on this device.

const KEY = "sounds-off";
const MIN_GAP_MS = 45; // the same sound never fires twice in a blink (double events)
const listeners = new Set<() => void>();
const files = new Map<SoundName, HTMLAudioElement>();
const lastPlayed = new Map<SoundName, number>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let manifestRequested = false;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

let toggledAt = -Infinity;

/** True for a moment after the switch is flipped: the speaker buttons animate only then, not on load. */
export const voiceJustToggled = (): boolean => performance.now() - toggledAt < 1000;

export function setSoundsOn(on: boolean): void {
  toggledAt = performance.now();
  try {
    localStorage.setItem(KEY, on ? "0" : "1");
  } catch {
    // Storage blocked: the choice just won't be remembered.
  }
  listeners.forEach((l) => l());
}

/** True when sounds are on. Re-renders when it is switched. */
export function useSoundsOn(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => true,
  );
}

function audio(): { ctx: AudioContext; master: GainNode } {
  if (!ctx || !master) {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Context();
    master = createOutput(ctx);
  }
  return { ctx, master };
}

/** Looks for ElevenLabs-made files once. Without public/sounds/manifest.json the built-in sounds play. */
export function preloadSounds(): void {
  if (typeof window === "undefined" || manifestRequested) return;
  manifestRequested = true;
  fetch("/sounds/manifest.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((manifest: Record<string, string> | null) => {
      for (const [name, file] of Object.entries(manifest ?? {})) {
        const el = new Audio(`/sounds/${file}`);
        el.preload = "auto";
        el.volume = 0.5;
        files.set(name as SoundName, el);
      }
    })
    .catch(() => {});
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined" || !read()) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);
  document.dispatchEvent(new CustomEvent("app:sound", { detail: name })); // lets tests listen in

  const file = files.get(name);
  if (file) {
    file.currentTime = 0;
    file.play().catch(() => {});
    return;
  }
  try {
    const { ctx, master } = audio();
    if (ctx.state === "suspended") void ctx.resume(); // browsers start audio paused until a tap
    // A few percent of random pitch each time: repeated taps sound alive, not like a machine.
    scheduleSound(ctx, master, name, ctx.currentTime + 0.005, 1 + (Math.random() - 0.5) * 0.05);
  } catch {
    // No audio available: stay quiet.
  }
}

/**
 * Which sound a button makes, if any. A button can say so itself with data-sound="add" (or "none");
 * otherwise its label decides: "One more …", "Add $20", "5 more" add; "One less …", "50 less" remove.
 */
export function soundForButton(button: HTMLElement): SoundName | null {
  const tagged = button.dataset.sound;
  if (tagged === "none") return null;
  if (tagged) return tagged as SoundName;
  const label = button.getAttribute("aria-label") ?? "";
  if (/^(add\b|one more\b|\d+ more\b)/i.test(label)) return "add";
  if (/^(one less\b|\d+ less\b|remove\b)/i.test(label)) return "remove";
  return null;
}
