"use client";

import { useEffect, useState } from "react";
import type { DaySummary } from "@/lib/types";

// "Busy days": average money in for each day of the week over the last month
// (Tiger Data: the sales_daily continuous aggregate, via /api/summary).

const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const money = (cents: number) => `$${Math.round(cents / 100)}`;

export function BusyDays() {
  const [days, setDays] = useState<DaySummary[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/summary?range=month")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("summary"))))
      .then((rows: DaySummary[]) => live && setDays(rows))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!days) return null;

  // Today is still in progress, so leave it out of the averages.
  const totals = NAMES.map(() => ({ sum: 0, n: 0 }));
  for (const d of days.slice(1)) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    totals[weekday].sum += d.moneyInCents;
    totals[weekday].n += 1;
  }
  const avg = totals.map((t) => (t.n ? t.sum / t.n : 0));
  const best = avg.indexOf(Math.max(...avg));
  if (avg[best] === 0) return null;

  // Monday first.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section
      aria-labelledby="busy-days"
      className="flex flex-col rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:flex-1 lg:p-6"
    >
      <h2 id="busy-days" className="text-2xl font-bold">
        Busy days
      </h2>
      <p className="mb-4 text-lg text-ink-soft">How much we sell on each day of the week</p>
      <div className="flex h-40 items-end gap-2 lg:h-auto lg:min-h-36 lg:flex-1">
        {order.map((i) => {
          const top = i === best;
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${NAMES[i]}: about ${money(avg[i])}`}
            >
              <span aria-hidden className="h-6 text-lg">
                {top ? "🔥" : ""}
              </span>
              <span className="text-sm font-semibold tabular-nums">{money(avg[i])}</span>
              <span
                className={`w-full rounded-t ${top ? "bg-butter" : "bg-sky"}`}
                style={{ height: `${Math.max(4, (avg[i] / avg[best]) * 70)}%` }}
              />
              <span className="text-sm text-ink-soft">{NAMES[i]}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xl font-semibold">
        <span aria-hidden>🔥</span> Busiest: {NAMES[best]}
      </p>
    </section>
  );
}
