"use client";

import { useEffect, useState } from "react";
import type { BuyResult } from "@/app/api/supplies/buy/route";
import { Icon } from "@/components/icons/Icon";
import { pictureFor } from "@/components/icons/supplyPicture";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { formatCents, formatDollars } from "@/lib/money";
import type { BoughtLine } from "@/lib/money-data";
import { formatAmount, unitOf } from "@/lib/units";
import { BuySheet } from "./BuySheet";

// Small buys (a few cups) would round to "$0": show cents below a dollar.
// Exact amounts for single purchases: a $1.50 carton must not read as "$2". Whole dollars stay short.
export const money = (cents: number) =>
  cents % 100 === 0 ? formatDollars(cents) : formatCents(cents);
// Units are plain words ("bags", "cartons", "units"): "1 bag", "3 bags". Shared with lib/units.
export { unitOf };

/** What the café bought in the period, with a big button to add something new. */
export function BoughtList({ label, lines }: { label: string; lines: BoughtLine[] }) {
  const [buying, setBuying] = useState(false);
  const [saved, setSaved] = useState<BuyResult | null>(null);

  // The confirmation goes away by itself.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(null), 6000);
    return () => clearTimeout(t);
  }, [saved]);

  const speechSummary =
    lines.length === 0
      ? `Nothing bought ${label.toLowerCase()}.`
      : `What we bought ${label.toLowerCase()}: ` +
        lines.map((l) => `${Math.round(l.qty)} ${unitOf(l.qty, l.unit)} of ${l.name} for ${money(l.costCents)}`).join(". ");

  return (
    <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">What we bought {label.toLowerCase()}</h2>
        <SpeakButton text={speechSummary} size="md" label={`Read what we bought ${label.toLowerCase()}`} />
      </div>
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
              <SpeakButton
                text={`${Math.round(l.qty)} ${unitOf(l.qty, l.unit)} of ${l.name}, ${money(l.costCents)}`}
                size="sm"
                label={`Read ${l.name}`}
              />
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
      {buying && <BuySheet onClose={() => setBuying(false)} onSaved={setSaved} />}
      {/* Floats above the page, so nothing on screen moves. Says the stock went up. */}
      {saved && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-md items-center gap-3 rounded-tile bg-sage px-5 py-4 text-xl font-bold shadow-lg"
        >
          <Icon name="check" className="size-8" />
          <span>
            {saved.name}: now {formatAmount(saved.stock, saved.stockUnit)} in stock
          </span>
        </p>
      )}
    </section>
  );
}
