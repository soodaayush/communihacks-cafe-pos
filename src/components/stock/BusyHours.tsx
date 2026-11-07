"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { BarChart } from "@/components/stock/BarChart";
import type { BusyHour } from "@/lib/types";

// "Busy hours": sales in each hour of the day over the last 2 weeks
// (Tiger Data: the sales_hourly continuous aggregate).

const label = (h: number) =>
  h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

/** The database groups by UTC hour; show the hour on this tablet's clock (same as the Money screen). */
const localHour = (utcHour: number) => new Date(Date.UTC(2026, 0, 15, utcHour)).getHours();

export function BusyHours() {
  const [hours, setHours] = useState<BusyHour[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/busy-hours?days=14")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("busy-hours"))))
      .then(
        (rows: BusyHour[]) =>
          live &&
          setHours(
            rows.map((h) => ({ ...h, hour: localHour(h.hour) })).sort((a, b) => a.hour - b.hour),
          ),
      )
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
    <section
      aria-labelledby="busy-hours"
      className="flex flex-col rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:flex-1 lg:p-6"
    >
      <h2 id="busy-hours" className="text-2xl font-bold">
        Busy hours
      </h2>
      <p className="mb-4 text-lg text-ink-soft">Sales in each hour, over the last 2 weeks</p>
      <BarChart
        label="Sales in each hour of the day"
        bars={shown.map((h) => ({
          label: label(h.hour),
          value: h.saleCount,
          highlight: h.hour === busiest.hour,
        }))}
      />
      <p className="mt-3 flex items-center gap-2 text-xl font-semibold">
        <Icon name="star" className="size-6" /> Busiest: {label(busiest.hour)}
      </p>
    </section>
  );
}
