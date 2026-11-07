import { Icon } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { formatDollars } from "@/lib/money";
import type { DayFlow } from "@/lib/money-data";
import { Person } from "./pictures";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Dates are UTC calendar days (YYYY-MM-DD), so read the weekday in UTC too.
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Each of the last 7 days: what customers paid (green) next to what we bought (pink). */
export function PaidVsBought({ days }: { days: DayFlow[] }) {
  const ordered = [...days].slice(0, 7).reverse(); // oldest first, today last
  const max = Math.max(1, ...ordered.flatMap((d) => [d.inCents, d.boughtCents]));
  const today = ordered[ordered.length - 1]?.date;
  const pct = (c: number) => `${(Math.max(c, 0) / max) * 100}%`;

  const speechSummary = `Daily comparison for the last ${ordered.length} days. Green shows money customers paid. Pink shows money spent buying stock. ` +
    ordered.map((d) => `${d.date === today ? "Today" : WEEKDAY[weekday(d.date)]}: paid ${formatDollars(d.inCents)}, bought ${formatDollars(d.boughtCents)}.`).join(" ");

  return (
    <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <div className="flex min-h-16 items-center justify-between">
        <h2 className="text-2xl font-bold">Each day</h2>
        <SpeakButton text={speechSummary} size="md" label="Read daily comparison" />
      </div>
      <div className="flex min-h-44 flex-1 items-end gap-3" aria-hidden>
        {ordered.length === 0 ? (
          <p className="m-auto text-lg text-ink-soft">No days yet</p>
        ) : (
          ordered.map((d) => (
            <div
              key={d.date}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1">
                <span
                  className="w-1/2 rounded-t-lg bg-sage"
                  style={{ height: pct(d.inCents), minHeight: 3 }}
                />
                <span
                  className="w-1/2 rounded-t-lg bg-blush"
                  style={{ height: pct(d.boughtCents), minHeight: 3 }}
                />
              </div>
              <span className={`text-base ${d.date === today ? "font-bold" : "text-ink-soft"}`}>
                {d.date === today ? "Today" : WEEKDAY[weekday(d.date)]}
              </span>
            </div>
          ))
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
        <span className="flex items-center gap-2">
          <span className="size-5 rounded bg-sage" aria-hidden />
          <Person className="size-6" />
          Customers paid
        </span>
        <span className="flex items-center gap-2">
          <span className="size-5 rounded bg-blush" aria-hidden />
          <Icon name="cart" className="size-6" />
          We bought
        </span>
      </p>
      <p className="sr-only">
        {ordered
          .map(
            (d) =>
              `${d.date}: customers paid ${formatDollars(d.inCents)}, we bought ${formatDollars(d.boughtCents)}.`,
          )
          .join(" ")}
      </p>
    </section>
  );
}
