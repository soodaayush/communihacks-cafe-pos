import { Icon } from "@/components/icons/Icon";
import { formatDollars } from "@/lib/money";
import type { DayKept } from "@/lib/money-data";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Dates are UTC calendar days (YYYY-MM-DD), so read the weekday in UTC too.
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/**
 * Money you kept, each of the last 7 days: green bars, the same green as the jar. The best day
 * gets a star. No axis and no numbers to read, except the best day's.
 */
export function DayBars({ days }: { days: DayKept[] }) {
  const ordered = [...days].reverse(); // oldest first, today last
  const kept = (d: DayKept) => Math.max(d.inCents - d.costCents, 0);
  const max = Math.max(1, ...ordered.map(kept));
  const best = ordered.reduce((a, b) => (kept(b) > kept(a) ? b : a), ordered[0]);
  const today = ordered[ordered.length - 1]?.date;

  return (
    <section className="flex flex-col gap-3 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <div className="flex min-h-16 items-center">
        <h2 className="text-2xl font-bold">Money you kept each day</h2>
      </div>
      <div className="flex min-h-44 flex-1 items-end gap-2" aria-hidden>
        {ordered.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="flex h-7 items-end">
              {d.date === best?.date && kept(d) > 0 && <Icon name="star" className="size-7" />}
            </span>
            <span
              className={`w-full rounded-t-xl ${d.date === best?.date ? "bg-sage" : "bg-sage/50"}`}
              style={{ height: `${(kept(d) / max) * 100}%`, minHeight: 4 }}
            />
            <span className={`text-base ${d.date === today ? "font-bold" : "text-ink-soft"}`}>
              {d.date === today ? "Today" : WEEKDAY[weekday(d.date)]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-lg">
        {best && kept(best) > 0 ? (
          <>
            Best day:{" "}
            <strong>{best.date === today ? "Today" : WEEKDAY_LONG[weekday(best.date)]}</strong>{" "}
            <span className="text-ink-soft tabular-nums">({formatDollars(kept(best))})</span>
          </>
        ) : (
          "No sales yet"
        )}
      </p>
    </section>
  );
}
