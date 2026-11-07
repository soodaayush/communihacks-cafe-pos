"use client";

// Pictures for the Money screen. Each one means one thing, every time:
//   bar = the money from customers, jar = the money you keep, person = a customer.
import { useEffect, useState, type ReactNode } from "react";

/** False on the first frame, then true: lets a CSS transition run from empty on mount. */
function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

export function Person({
  className = "size-8",
  color = "text-ink/70",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} ${color}`} fill="currentColor">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0z" />
    </svg>
  );
}

/** A small jar: "this money is yours". */
export function MiniJar({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#4a4a55"
      strokeWidth={2}
    >
      <path d="M8 3h8" strokeLinecap="round" />
      <path d="M7 6h10v12a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" fill="#fffdf9" />
      <path
        d="M7.5 12h9v6a2.5 2.5 0 0 1-2.5 2.5h-4A2.5 2.5 0 0 1 7.5 18z"
        fill="#b8d4c0"
        stroke="none"
      />
    </svg>
  );
}

export interface BarPart {
  cents: number;
  className: string;
  label?: string;
  /** A small picture saying what this part of the money is for. */
  icon?: ReactNode;
}

/** Money as one bar. `scale` is the amount that fills the whole width. Parts grow in on mount. */
export function MoneyBar({ parts, scale }: { parts: BarPart[]; scale: number }) {
  return (
    <span aria-hidden className="flex h-20 w-full overflow-hidden rounded-2xl bg-ink/5">
      {parts.map((p, i) => (
        <BarSegment key={i} part={p} scale={scale} />
      ))}
    </span>
  );
}

function BarSegment({ part, scale }: { part: BarPart; scale: number }) {
  const entered = useEntered();
  const pct = (Math.max(part.cents, 0) / scale) * 100;
  return (
    <span
      className={`flex h-full items-center justify-center gap-2 overflow-hidden text-xl font-bold whitespace-nowrap tabular-nums motion-safe:transition-[width,background-color,opacity] motion-safe:duration-500 motion-safe:ease-out ${part.className}`}
      style={{ width: `${entered ? pct : 0}%` }}
    >
      {pct >= 12 && part.icon}
      {part.label && pct >= 30 ? part.label : null}
    </span>
  );
}
