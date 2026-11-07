"use client";

import { useSyncExternalStore } from "react";
import type { BusyHour } from "@/lib/types";

/** The database groups by UTC hour; show the hour on this tablet's clock instead. */
function localHour(utcHour: number): number {
  return new Date(Date.UTC(2026, 0, 15, utcHour)).getHours();
}
const label = (h: number) =>
  h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
const say = (h: number) =>
  h === 0 ? "12 am" : h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`;

// The server can't know the tablet's time zone: render the chart only in the browser.
const subscribe = () => () => {};
const useInBrowser = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** When customers come, by hour of the day. The busiest hour gets a star. */
export function BusyHours({ hours }: { hours: BusyHour[] }) {
  const inBrowser = useInBrowser();
  const byLocal = hours
    .map((h) => ({ hour: inBrowser ? localHour(h.hour) : h.hour, count: h.saleCount }))
    .sort((a, b) => a.hour - b.hour);
  const open = byLocal.filter((h) => h.count > 0);
  const first = open[0]?.hour ?? 8;
  const last = open[open.length - 1]?.hour ?? 17;
  const shown = byLocal.filter((h) => h.hour >= first && h.hour <= last);
  const max = Math.max(1, ...shown.map((h) => h.count));
  const busiest = shown.reduce((a, b) => (b.count > a.count ? b : a), shown[0]);

  return (
    <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <h2 className="text-2xl font-bold">Busiest time</h2>
      <div className="flex h-40 items-end gap-1" aria-hidden>
        {inBrowser &&
          shown.map((h) => (
            <div
              key={h.hour}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="h-6 text-xl leading-none">
                {h === busiest && h.count > 0 ? "⭐" : ""}
              </span>
              <span
                className={`w-full rounded-t-lg ${h === busiest ? "bg-sage" : "bg-sky"}`}
                style={{ height: `${(h.count / max) * 100}%`, minHeight: 3 }}
              />
              <span className="h-5 text-xs text-ink-soft">
                {h.hour % 2 === 0 ? label(h.hour) : ""}
              </span>
            </div>
          ))}
      </div>
      <p className="h-7 text-lg">
        {inBrowser && busiest && busiest.count > 0 ? (
          <>
            Most people come around <strong>{say(busiest.hour)}</strong>
          </>
        ) : (
          ""
        )}
      </p>
    </section>
  );
}
