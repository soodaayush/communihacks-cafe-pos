"use client";

import { useEffect, useState } from "react";
import type { BusyHour } from "@/lib/types";

// "Busy hours": sales per hour of the day over the last 2 weeks (Tiger Data: sales_hourly aggregate).

const label = (h: number) =>
  h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

export function BusyHours() {
  const [hours, setHours] = useState<BusyHour[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/busy-hours?days=14")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("busy-hours"))))
      .then((rows: BusyHour[]) => live && setHours(rows))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!hours) return null;
  const open = hours.filter((h) => h.saleCount > 0);
  if (open.length === 0) return null;

  // Only the hours we were open.
  const from = Math.min(...open.map((h) => h.hour));
  const to = Math.max(...open.map((h) => h.hour));
  const shown = hours.filter((h) => h.hour >= from && h.hour <= to);
  const busiest = shown.reduce((a, b) => (b.saleCount > a.saleCount ? b : a));

  return (
    <section aria-labelledby="busy-hours" className="rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <h2 id="busy-hours" className="text-2xl font-bold">
        Busy hours
      </h2>
      <p className="mb-4 text-lg text-ink-soft">How many people bought, hour by hour</p>
      <div className="flex h-40 items-end gap-2">
        {shown.map((h) => {
          const top = h.hour === busiest.hour;
          return (
            <div
              key={h.hour}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${label(h.hour)}: ${h.saleCount} sales`}
            >
              <span aria-hidden className="h-6 text-lg">
                {top ? "🔥" : ""}
              </span>
              <span
                className={`w-full rounded-t ${top ? "bg-butter" : "bg-sky"}`}
                style={{ height: `${Math.max(4, (h.saleCount / busiest.saleCount) * 80)}%` }}
              />
              <span className="text-sm text-ink-soft">{label(h.hour)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xl font-semibold">
        <span aria-hidden>🔥</span> Busiest: {label(busiest.hour)}
      </p>
    </section>
  );
}
