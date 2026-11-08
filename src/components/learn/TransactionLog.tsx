"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import {
  canAdd,
  canChange,
  describeTransaction,
  type LearnKind,
  type LearnTransaction,
} from "@/lib/learn";
import { useLearnProgress } from "@/lib/learn-progress";
import { formatCents } from "@/lib/money";
import { ItemChips, PaymentLabel } from "./TransactionBits";

// Days and times follow this tablet's clock, which the server cannot know: the real rows are drawn
// only in the browser, and the server draws neutral placeholders (so nothing mismatches).
const subscribe = () => () => {};
const useInBrowser = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

/** Practised (green with a tick) or still to do (faint). Hidden when that practice is not possible. */
function Mark({ icon, state }: { icon: IconName; state: "done" | "todo" | "none" }) {
  if (state === "none") return <span className="size-8 sm:size-10" aria-hidden />;
  return (
    <span
      aria-hidden
      className={`relative flex size-8 items-center justify-center rounded-full sm:size-10 ${state === "done" ? "bg-sage" : "bg-ink/5"}`}
    >
      <Icon name={icon} className={`size-5 sm:size-6 ${state === "done" ? "" : "opacity-40"}`} />
      {state === "done" && (
        <Icon name="check" className="absolute -right-1 -bottom-1 size-5 rounded-full bg-white" />
      )}
    </span>
  );
}

const ROW =
  "flex h-24 w-full items-center gap-2 rounded-tile bg-white px-3 text-left sm:gap-3 sm:px-4";

export function TransactionLog({
  transactions,
  selectedId,
  onSelect,
  more,
}: {
  transactions: LearnTransaction[];
  selectedId: string | null;
  onSelect: (tx: LearnTransaction) => void;
  more: number | null;
}) {
  const inBrowser = useInBrowser();
  const progress = useLearnProgress();

  // Newest first, grouped by day on this tablet's clock.
  const groups: { heading: string; items: LearnTransaction[] }[] = [];
  if (inBrowser) {
    for (const tx of transactions) {
      const heading = dayHeading(tx.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.heading === heading) last.items.push(tx);
      else groups.push({ heading, items: [tx] });
    }
  }

  return (
    <section
      aria-label="Sales log"
      className="flex h-full min-h-0 flex-col gap-3 rounded-tile bg-white/50 p-3 ring-1 ring-ink/10 sm:p-4"
    >
      <div className="flex shrink-0 items-center gap-3 px-1">
        <h2 className="flex-1 text-2xl font-bold">Sales</h2>
        <span
          className="flex items-center gap-1.5 text-xl font-bold tabular-nums"
          aria-label={`${progress.stars} stars`}
        >
          <Icon name="star" className="size-7" />
          {progress.stars}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1">
        {!inBrowser &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} aria-hidden className={`${ROW} opacity-60 ring-1 ring-ink/10`} />
          ))}

        {inBrowser && transactions.length === 0 && (
          <p className="m-auto text-xl text-ink-soft">No sales yet</p>
        )}

        {groups.map((g) => (
          <div key={g.heading} className="flex flex-col gap-2">
            <h3 className="px-1 text-xl font-bold text-ink-soft">{g.heading}</h3>
            {g.items.map((tx) => {
              const addOk = canAdd(tx);
              const changeOk = canChange(tx);
              const done = progress.done[tx.id] ?? {};
              const state = (kind: LearnKind, ok: boolean) =>
                !ok ? "none" : done[kind] ? "done" : "todo";
              const selected = tx.id === selectedId;
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelect(tx)}
                  aria-pressed={selected}
                  aria-label={`${timeOf(tx.createdAt)}. ${describeTransaction(tx)}. ${formatCents(tx.totalCents)}. ${tx.paymentMethod === "cash" ? "Cash" : "Card"}.`}
                  className={`${ROW} motion-safe:transition-[box-shadow,opacity,scale] motion-safe:duration-200 motion-safe:active:scale-[0.99] ${selected ? "ring-2 ring-ink" : "ring-1 ring-ink/10"}`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="text-base leading-none font-semibold text-ink-soft tabular-nums">
                      {timeOf(tx.createdAt)}
                    </span>
                    <span className="overflow-hidden pt-2 pr-2">
                      <ItemChips lines={tx.lines} />
                    </span>
                  </span>
                  <span className="flex w-24 shrink-0 flex-col items-end">
                    <span className="text-2xl font-bold tabular-nums">
                      {formatCents(tx.totalCents)}
                    </span>
                    <PaymentLabel method={tx.paymentMethod} />
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Mark icon="receipt" state={state("add", addOk)} />
                    <Mark icon="coin" state={state("change", changeOk)} />
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {more !== null && inBrowser && (
          <Link
            href={`/learn?n=${more}`}
            scroll={false}
            className="flex min-h-touch shrink-0 items-center justify-center rounded-tile bg-white text-xl font-bold ring-1 ring-ink/15 motion-safe:active:scale-[0.99]"
          >
            Show more
          </Link>
        )}
      </div>
    </section>
  );
}
