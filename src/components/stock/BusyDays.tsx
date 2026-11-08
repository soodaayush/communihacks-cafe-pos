"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { BarChart } from "@/components/stock/BarChart";
import { SpeakButton } from "@/components/voice/SpeakButton";
import type { DaySummary } from "@/lib/types";

// "Busy days": average money in for each day of the week over the last month
// (Tiger Data: the sales_daily continuous aggregate, via /api/summary).

const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dollars = (n: number) => `$${n}`;

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
  // Whole dollars, for an average day.
  const avg = totals.map((t) => (t.n ? Math.round(t.sum / t.n / 100) : 0));
  const best = avg.indexOf(Math.max(...avg));
  if (avg[best] === 0) return null;

  // Monday first.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <section
      aria-labelledby="busy-days"
      className="flex flex-col rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:flex-1 lg:p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 id="busy-days" className="text-2xl font-bold">
            Busy days
          </h2>
          <p className="mb-4 text-lg text-ink-soft">Money in on an average day of the week</p>
        </div>
        <SpeakButton
          text={`Busy days. In the last month, the busiest day was ${NAMES[best]}. On a ${NAMES[best]}, customers pay about ${dollars(avg[best])}.`}
          size="md"
          label="Read busy days"
        />
      </div>
      <BarChart
        label="Average money in for each day of the week"
        format={dollars}
        bars={order.map((i) => ({ label: NAMES[i], value: avg[i], highlight: i === best }))}
      />
      <p className="mt-3 flex items-center gap-2 text-xl font-semibold">
        <Icon name="star" className="size-6" /> Busiest: {NAMES[best]}
      </p>
    </section>
  );
}
