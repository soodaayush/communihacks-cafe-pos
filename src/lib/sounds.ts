"use client";

import { useSyncExternalStore } from "react";

// Small sound effects (a pop when you add something, a cash register when a sale saves...). They are
// made once with ElevenLabs Sound Effects (npm run sounds) and saved in public/sounds, so playing
// them costs nothing. Some people are sensitive to noise, so there is an on/off switch that is
// remembered on this device. If a sound file is missing, nothing happens.

export type SoundName = "add" | "remove" | "sale" | "success" | "error" | "listen";

const KEY = "sounds-off";
const VOLUME = 0.5;
const listeners = new Set<() => void>();
const cache = new Map<SoundName, HTMLAudioElement>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

export function setSoundsOn(on: boolean): void {
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

function audioFor(name: SoundName): HTMLAudioElement {
  let el = cache.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.mp3`);
    el.preload = "auto";
    el.volume = VOLUME;
    cache.set(name, el);
  }
  return el;
}

/** Fetch the sounds now, so the first tap does not wait. */
export function preloadSounds(): void {
  if (typeof window === "undefined" || !read()) return;
  (["add", "remove", "sale", "success", "error", "listen"] as SoundName[]).forEach(audioFor);
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined" || !read()) return;
  const el = audioFor(name);
  el.currentTime = 0;
  el.play().catch(() => {
    // Blocked, or the file is not there: stay quiet.
  });
}
