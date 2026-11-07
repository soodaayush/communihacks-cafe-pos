"use client";

// Pictures used by the What-if screen. Each one stands for one idea, every time it appears:
//   jar = money you keep in a day, bar = money from one sale, person = one customer.
// They animate in from empty, and glide when their amounts change.
import Image from "next/image";
import type { ReactNode } from "react";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import type { Outcome } from "@/lib/whatif";
import { useEntered } from "./motion";

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

const MAX_FACES = 40;

/**
 * How many people buy, before and after a price change. Everyone starts on screen; then the
 * people who stop buying fade away, or the new customers pop in (in green).
 */
export function PeopleChange({ from, to }: { from: number; to: number }) {
  const entered = useEntered();
  const total = Math.min(Math.max(from, to), MAX_FACES);
  const stay = Math.min(from, to, MAX_FACES);
  return (
    <span aria-hidden className="flex max-w-lg flex-wrap justify-center gap-1">
      {Array.from({ length: total }, (_, i) => {
        const leaving = to < from && i >= stay;
        const joining = to > from && i >= stay;
        const state = leaving
          ? entered
            ? "translate-y-2 opacity-15"
            : "opacity-100"
          : joining
            ? entered
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0"
            : "opacity-100";
        return (
          <span
            key={i}
            className={`motion-safe:transition-[opacity,scale,translate] motion-safe:duration-500 ${state}`}
            style={{ transitionDelay: `${500 + (i - stay) * 60}ms` }}
          >
            <Person className="size-8" color={joining ? "text-[#6f9f7c]" : "text-ink/70"} />
          </span>
        );
      })}
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
  /** A small picture saying what this part of the money is for. */
  icon?: ReactNode;
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

/**
 * Money from one sale, as one bar. `scale` is the amount that fills the whole width.
 * Kept on screen between story steps, its parts slide and change colour instead of jumping.
 */
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

/** One sale as a bar: pink part buys the item, green part is yours. A loss has no green part. */
export function SaleBar({ item, r, scale }: { item: MenuItem; r: Outcome; scale: number }) {
  const itemPic = (
    <Image
      src={imageUrl(item.imagePublicId)}
      alt=""
      width={40}
      height={40}
      unoptimized
      className="size-10"
    />
  );
  const parts: BarPart[] =
    r.keepEachCents >= 0
      ? [
          { cents: item.costCents, className: "bg-blush", icon: itemPic },
          {
            cents: r.keepEachCents,
            className: "bg-sage",
            label: formatCents(r.keepEachCents),
            icon: <MiniJar />,
          },
        ]
      : [{ cents: r.priceCents, className: "bg-blush", icon: itemPic }];
  return <MoneyBar scale={scale} parts={parts} />;
}
