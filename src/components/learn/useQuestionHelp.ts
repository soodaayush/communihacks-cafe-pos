"use client";

// One question's state: wrong tries, the three hints, and the "why" shown after the right answer.
// Gemini's words come from /api/learn/hint and /api/learn/explain. Both are asked at most once,
// wait at most 4 seconds, and are checked again here; if anything goes wrong the fixed words from
// src/lib/learn.ts are used, silently.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fallbackExplanation,
  fallbackHints,
  isGoodExplanation,
  MAX_HINTS,
  mergeHints,
  type LearnQuestion,
  type LearnTransaction,
} from "@/lib/learn";

const TIMEOUT_MS = 4000;

export interface QuestionHelp {
  /** Wrong amounts tapped so far (greyed out). */
  tried: number[];
  solved: boolean;
  /** Hints shown so far. A hint never changes once shown. */
  revealed: string[];
  canHint: boolean;
  /** The "why", once the answer is right and the words are ready. */
  explanation: string | null;
  /** True if this question was solved with no wrong tap and no hint. */
  clean: boolean;
  choose: (cents: number) => void;
  showHint: () => void;
}

export function useQuestionHelp(
  tx: LearnTransaction,
  q: LearnQuestion,
  onSolved?: (clean: boolean) => void,
): QuestionHelp {
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [clean, setClean] = useState(false);
  const [ladder, setLadder] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const asked = useRef(false);
  const mounted = useRef(false);
  const aborts = useRef(new Set<AbortController>());

  useEffect(() => {
    mounted.current = true;
    const pending = aborts.current;
    return () => {
      mounted.current = false;
      pending.forEach((a) => a.abort());
    };
  }, []);

  /** POST JSON; null on any problem or after 4 seconds. */
  const post = useCallback(async <T>(url: string, body: unknown): Promise<T | null> => {
    const ctrl = new AbortController();
    aborts.current.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      return r.ok ? ((await r.json()) as T) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      aborts.current.delete(ctrl);
    }
  }, []);

  const choose = useCallback(
    (cents: number) => {
      if (solved || tried.includes(cents)) return;
      if (cents === q.correctCents) {
        const isClean = tried.length === 0 && revealed.length === 0;
        setClean(isClean);
        setSolved(true);
        onSolved?.(isClean);
        return;
      }
      setTried((t) => [...t, cents]);
      if (asked.current) return; // hints are worded once, for the first mistake
      asked.current = true;
      const fixed = fallbackHints(q, cents);
      void post<{ hints?: unknown }>("/api/learn/hint", {
        transactionId: tx.id,
        kind: q.kind,
        step: q.step,
        wrongCents: cents,
      }).then((res) => {
        if (!mounted.current) return;
        const candidate = Array.isArray(res?.hints) ? res.hints.map(String) : null;
        setLadder(mergeHints(candidate, q, fixed).hints);
      });
    },
    [solved, tried, revealed.length, q, tx.id, post, onSolved],
  );

  // A hint shows the moment 💡 is tapped: Gemini's if it is ready, otherwise the fixed one.
  const showHint = useCallback(() => {
    if (revealed.length >= MAX_HINTS || tried.length === 0) return;
    const hints = ladder ?? fallbackHints(q, tried[0]);
    setRevealed((r) => [...r, hints[r.length]]);
  }, [ladder, q, revealed.length, tried]);

  // After the right answer, word the "why".
  useEffect(() => {
    if (!solved) return;
    let live = true;
    void post<{ text?: unknown }>("/api/learn/explain", {
      transactionId: tx.id,
      kind: q.kind,
      step: q.step,
    }).then((res) => {
      if (!live || !mounted.current) return;
      const text = typeof res?.text === "string" ? res.text.trim() : "";
      setExplanation(isGoodExplanation(text, q) ? text : fallbackExplanation(q));
    });
    return () => {
      live = false;
    };
  }, [solved, q, tx.id, post]);

  return {
    tried,
    solved,
    revealed,
    canHint: tried.length > 0 && revealed.length < MAX_HINTS,
    explanation,
    clean,
    choose,
    showHint,
  };
}
