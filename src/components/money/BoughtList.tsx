"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { pictureFor } from "@/components/icons/supplyPicture";
import { formatCents, formatDollars } from "@/lib/money";
import type { BoughtLine } from "@/lib/money-data";
import { BuySheet } from "./BuySheet";

// Small buys (a few cups) would round to "$0": show cents below a dollar.
// Exact amounts for single purchases: a $1.50 carton must not read as "$2". Whole dollars stay short.
export const money = (cents: number) =>
  cents % 100 === 0 ? formatDollars(cents) : formatCents(cents);
// Units are plain words ("bags", "cartons", "units"): "1 bag", "3 bags".
export const unitOf = (n: number, unit: string) =>
  Math.round(n) === 1 ? unit.replace(/s$/, "") : unit;

/** What the café bought in the period, with a big button to add something new. */
export function BoughtList({ label, lines }: { label: string; lines: BoughtLine[] }) {
  const [buying, setBuying] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <h2 className="text-2xl font-bold">What we bought {label.toLowerCase()}</h2>
      <ul className="flex h-56 flex-col gap-2 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <li className="m-auto text-lg text-ink-soft">Nothing bought yet</li>
        ) : (
          lines.map((l) => (
            <li
              key={`${l.kind}:${l.name}`}
              className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2"
            >
              <Icon name={pictureFor(l.name)} className="size-10" />
              <span className="flex-1 text-lg font-semibold">{l.name}</span>
              <span className="text-lg text-ink-soft tabular-nums">
                {Math.round(l.qty)} {unitOf(l.qty, l.unit)}
              </span>
              <span className="w-20 text-right text-xl font-bold tabular-nums">
                {money(l.costCents)}
              </span>
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        onClick={() => setBuying(true)}
        className="flex min-h-touch items-center justify-center gap-3 rounded-tile bg-blush text-2xl font-bold ring-1 ring-ink/10 motion-safe:active:scale-[0.98]"
      >
        <Icon name="cart" className="size-8" />
        We bought something
      </button>
      {buying && <BuySheet onClose={() => setBuying(false)} />}
    </section>
  );
}
