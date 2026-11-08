"use client";

// What the cashier has practised, remembered on this tablet only (browser storage can be blocked
// or empty, so nothing depends on it). Shared by the transaction log and the two games.
import { useSyncExternalStore } from "react";
import type { LearnKind } from "./learn";

const KEY = "learn-progress-v1";

export interface LearnProgress {
  /** Stars for practice finished without a single wrong answer or hint. */
  stars: number;
  /** Transactions practised, and which kind of practice. */
  done: Record<string, Partial<Record<LearnKind, boolean>>>;
}

const EMPTY: LearnProgress = { stars: 0, done: {} };
let cache: { raw: string | null; value: LearnProgress } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function read(): LearnProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.value; // same text, same object: React needs a stable value
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    cache = { raw, value: { stars: Number(parsed.stars) || 0, done: parsed.done ?? {} } };
    return cache.value;
  } catch {
    return EMPTY;
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useLearnProgress(): LearnProgress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Call when a game is finished. `perfect` = no wrong answer and no hint, which earns a star. */
export function markDone(txId: string, kind: LearnKind, perfect: boolean): void {
  const now = read();
  const next: LearnProgress = {
    stars: now.stars + (perfect ? 1 : 0),
    done: { ...now.done, [txId]: { ...now.done[txId], [kind]: true } },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // fine: progress just is not remembered
  }
  listeners.forEach((l) => l());
}
