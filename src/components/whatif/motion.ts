"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** False on the first frame, then true: lets a CSS transition run from its "empty" state on mount. */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

/** Glides a number to `target` (ease-out), so amounts count up or down instead of jumping. */
export function useTweened(target: number, ms = 500): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const start = current.current;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = reducedMotion() ? 1 : Math.min((now - t0) / ms, 1);
      current.current = start + (target - start) * (1 - (1 - k) ** 3);
      setValue(current.current);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}
