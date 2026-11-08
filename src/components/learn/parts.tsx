"use client";

// Small pictures shared by both Learn games: the lightbulb, an item chip and an amount tile.
import Image from "next/image";
import type { ReactNode } from "react";
import { imageUrl } from "@/lib/images";
import { formatCents } from "@/lib/money";
import type { LearnUnit } from "@/lib/learn";

/** A lightbulb, drawn like the app's icon set (thick rounded lines, pastel fill). */
export function HintBulb({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 31c0-3-5-6-5-12a12 12 0 0 1 24 0c0 6-5 9-5 12z" fill="#f3e3ad" />
      <path d="M18 38h12M20 43h8" />
    </svg>
  );
}

export type ChipState = "sofar" | "next" | "later" | "done";

const CHIP: Record<ChipState, string> = {
  sofar: "bg-sky/40",
  next: "bg-white ring-4 ring-ink",
  later: "bg-cream opacity-50",
  done: "bg-sage/50",
};

export function ItemPicture({
  unit,
  className = "size-14 sm:size-20 [@media(max-height:760px)]:size-12",
}: {
  unit: LearnUnit;
  className?: string;
}) {
  return (
    <Image
      src={imageUrl(unit.imagePublicId)}
      alt=""
      width={96}
      height={96}
      unoptimized
      className={className}
    />
  );
}

/** A menu picture by its image id (the games draw pictures from the question itself). */
export function PieceImage({
  id,
  className = "size-14 sm:size-20 [@media(max-height:760px)]:size-12",
}: {
  id: string;
  className?: string;
}) {
  return (
    <Image src={imageUrl(id)} alt="" width={96} height={96} unoptimized className={className} />
  );
}

/** One thing that was sold: its picture and its price. */
export function Chip({ unit, state }: { unit: LearnUnit; state: ChipState }) {
  return (
    <span
      className={`flex w-[5.5rem] flex-col items-center gap-0.5 rounded-2xl p-1.5 motion-safe:transition-[background-color,box-shadow,opacity] motion-safe:duration-300 sm:w-28 sm:p-2 ${CHIP[state]}`}
    >
      <ItemPicture unit={unit} />
      <span className="text-sm font-semibold tabular-nums sm:text-base">
        {formatCents(unit.priceCents)}
      </span>
    </span>
  );
}

/** A labelled amount: a few pictures on top, a small label, a big amount. */
export function AmountTile({
  label,
  amount,
  tone = "bg-cream",
  children,
}: {
  label: string;
  /** The amount, or "?" for the one to work out. */
  amount: string;
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl p-2 motion-safe:transition-colors motion-safe:duration-300 sm:p-3 ${tone}`}
    >
      <div className="flex min-h-14 items-center justify-center">{children}</div>
      <p className="max-w-full truncate text-sm text-ink-soft sm:text-base">{label}</p>
      <p className="text-2xl font-bold tabular-nums sm:text-4xl">{amount}</p>
    </div>
  );
}
