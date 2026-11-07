"use client";

// Pictures used by the What-if screen. Each one stands for one idea, every time it appears:
//   jar = money you keep in a day, bar = money from one sale, person = one customer.
// They animate in from empty, and glide when their amounts change.
import { useEntered } from "./motion";

export function Person({ className = "size-8" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} text-ink/70`} fill="currentColor">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0z" />
    </svg>
  );
}

/** Customers popping in one after another. */
export function People({ count, className = "size-9" }: { count: number; className?: string }) {
  const entered = useEntered();
  const gap = Math.min(45, 900 / Math.max(count, 1));
  return (
    <span aria-hidden className="flex max-w-md flex-wrap justify-center gap-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`motion-safe:transition-[opacity,scale] motion-safe:duration-300 ${entered ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          style={{ transitionDelay: `${i * gap}ms` }}
        >
          <Person className={className} />
        </span>
      ))}
    </span>
  );
}

/**
 * A jar filled to `fill` (0 to 1). It fills up from empty, and rises or drains when `fill` changes.
 * With `layers`, the money is drawn as that many slices that appear one by one, one per customer,
 * so "10 × $2.40" is something you can watch and count.
 */
export function Jar({
  fill,
  layers,
  size = "md",
}: {
  fill: number;
  layers?: number;
  size?: "md" | "lg";
}) {
  const entered = useEntered();
  const box = size === "lg" ? "h-56 w-40" : "h-40 w-28";
  const pct = entered ? Math.min(Math.max(fill, 0), 1) * 100 : 0;
  const gap = layers ? Math.min(90, 1100 / layers) : 0;
  return (
    <span aria-hidden className="flex flex-col items-center">
      <span className="h-3 w-3/4 rounded-t-lg bg-ink/30" />
      <span
        className={`relative flex flex-col justify-end overflow-hidden rounded-t-xl rounded-b-[2.5rem] border-4 border-ink/30 bg-white ${box}`}
      >
        <span
          className="flex w-full flex-col-reverse bg-sage motion-safe:transition-[height] motion-safe:duration-700 motion-safe:ease-out"
          style={{ height: `${pct}%` }}
        >
          {layers !== undefined &&
            layers > 0 &&
            Array.from({ length: layers }, (_, i) => (
              <span
                key={i}
                className={`flex-1 border-t border-white/80 motion-safe:transition-opacity motion-safe:duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: `${i * gap}ms` }}
              />
            ))}
        </span>
      </span>
    </span>
  );
}

export interface BarPart {
  cents: number;
  className: string;
  label?: string;
}

/**
 * Money from one sale, as one bar. `scale` is the amount that fills the whole width.
 * Kept on screen between story steps, its parts slide and change colour instead of jumping.
 */
export function MoneyBar({ parts, scale }: { parts: BarPart[]; scale: number }) {
  return (
    <span aria-hidden className="flex h-16 w-full overflow-hidden rounded-2xl bg-ink/5">
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
      className={`flex h-full items-center justify-center overflow-hidden text-xl font-bold whitespace-nowrap tabular-nums motion-safe:transition-[width,background-color] motion-safe:duration-500 motion-safe:ease-out ${part.className}`}
      style={{ width: `${entered ? pct : 0}%` }}
    >
      {part.label && pct >= 18 ? part.label : null}
    </span>
  );
}
