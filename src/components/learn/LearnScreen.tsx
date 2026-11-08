"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import {
  canAdd,
  canChange,
  describeTransaction,
  type LearnKind,
  type LearnTransaction,
} from "@/lib/learn";
import { formatCents } from "@/lib/money";
import { AddUpGame } from "./AddUpGame";
import { ChangeGame } from "./ChangeGame";
import { ItemChips, PaymentLabel } from "./TransactionBits";
import { TransactionLog } from "./TransactionLog";

const KINDS: {
  kind: LearnKind;
  label: string;
  icon: IconName;
  ok: (t: LearnTransaction) => boolean;
}[] = [
  { kind: "add", label: "Add it up", icon: "receipt", ok: canAdd },
  { kind: "change", label: "Make change", icon: "coin", ok: canChange },
];

// Every sale has both practices; "Add it up" comes first.
const firstKind = (tx: LearnTransaction): LearnKind | null =>
  KINDS.find((k) => k.ok(tx))?.kind ?? null;

/**
 * The sales log, and the practice for the sale you pick.
 * Laptop: log on the left, practice on the right. Phone: one at a time, with a big Back button
 * (never two layers on top of each other, so nothing jumps).
 */
export function LearnScreen({
  transactions,
  more,
}: {
  transactions: LearnTransaction[];
  more: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<LearnKind | null>(null);

  const tx = transactions.find((t) => t.id === selectedId) ?? null;
  const active = tx ? KINDS.filter((k) => k.ok(tx)) : [];
  // If the chosen practice is not possible for this sale, use the first one that is.
  const shownKind = tx ? (active.some((k) => k.kind === kind) ? kind : firstKind(tx)) : null;

  function pick(next: LearnTransaction) {
    setSelectedId(next.id);
    setKind(firstKind(next));
  }

  // After a game: Add it up leads on to Make change (same sale); anything else moves on to the
  // next sale you can practise on a laptop, or back to the log on a phone.
  function finished() {
    if (!tx) return;
    if (shownKind === "add" && canChange(tx)) {
      setKind("change");
      return;
    }
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const here = transactions.findIndex((t) => t.id === tx.id);
    const next = transactions.slice(here + 1).find((t) => firstKind(t) !== null);
    if (wide && next) pick(next);
    else setSelectedId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-6">
      <div className={`min-h-0 flex-1 flex-col gap-3 ${tx ? "flex" : "hidden lg:flex"}`}>
        {tx ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex min-h-14 shrink-0 items-center gap-2 self-start rounded-full bg-white px-6 text-xl font-bold ring-1 ring-ink/15 motion-safe:active:scale-95 lg:hidden"
            >
              <span aria-hidden>←</span> Back
            </button>

            <section className="flex shrink-0 items-center gap-4 rounded-tile bg-white p-4 ring-1 ring-ink/10 lg:hidden">
              <div className="min-w-0 flex-1 overflow-hidden pt-2 pr-2">
                <ItemChips lines={tx.lines} max={5} size="lg" />
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-3xl font-bold tabular-nums">
                  {formatCents(tx.totalCents)}
                </span>
                <PaymentLabel method={tx.paymentMethod} />
              </div>
              <SpeakButton
                text={`${describeTransaction(tx)}. Total ${formatCents(tx.totalCents)}.`}
                label="Read this sale out loud"
                size="md"
              />
            </section>

            {active.length > 0 ? (
              <>
                <div className="flex shrink-0 items-center gap-3">
                  <div role="tablist" aria-label="Practice" className="flex min-w-0 flex-1 gap-3">
                    {active.map((k) => (
                      <button
                        key={k.kind}
                        type="button"
                        role="tab"
                        aria-selected={shownKind === k.kind}
                        onClick={() => setKind(k.kind)}
                        className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full text-lg font-bold motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 sm:text-xl ${shownKind === k.kind ? "bg-white ring-2 ring-ink" : "bg-white/50 ring-1 ring-ink/10"}`}
                      >
                        <Icon name={k.icon} className="size-7" />
                        {k.label}
                      </button>
                    ))}
                  </div>
                  {/* The sale strip is hidden on a laptop (the selected row is in the log), so its speaker lives here. */}
                  <div className="hidden lg:block">
                    <SpeakButton
                      text={`${describeTransaction(tx)}. Total ${formatCents(tx.totalCents)}.`}
                      label="Read this sale out loud"
                      size="md"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  {shownKind === "add" && (
                    <AddUpGame key={`${tx.id}:add`} tx={tx} onDone={finished} />
                  )}
                  {shownKind === "change" && (
                    <ChangeGame key={`${tx.id}:change`} tx={tx} onDone={finished} />
                  )}
                </div>
              </>
            ) : (
              <div className="m-auto text-ink-soft">
                <Icon name="book" className="size-16" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-tile bg-white/50 text-ink-soft ring-1 ring-ink/10">
            <Icon name="book" className="size-20" />
            <p className="text-2xl font-semibold">Pick a sale</p>
          </div>
        )}
      </div>

      <div className={`min-h-0 flex-1 ${tx ? "hidden lg:block" : "block"}`}>
        <TransactionLog
          transactions={transactions}
          selectedId={selectedId}
          onSelect={pick}
          more={more}
        />
      </div>
    </div>
  );
}
