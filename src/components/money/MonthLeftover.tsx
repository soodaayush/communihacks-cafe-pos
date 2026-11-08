import { dollars, monthName, type BudgetMonth } from "@/lib/budget";
import { StartBalanceButton } from "./StartBalanceButton";

// The app's money meanings: green = came in, rose = went out.
const IN = "#93c6a3";
const OUT = "#e8a59d";

/**
 * This month in two pictures: money in vs money out on the same scale (which bar is longer?),
 * then the balance it leaves: start of the month → now, carried into next month.
 */
export function MonthLeftover({ months }: { months: BudgetMonth[] }) {
  const now = months.at(-1);
  if (!now) return null;
  const { openingCents: start, inCents: inn, outCents: out, closingCents: end } = now;
  const diff = inn - out;
  const max = Math.max(inn, out, 1);
  const name = monthName(now.month);
  const nextMonth = monthName(
    new Date(Date.UTC(+now.month.slice(0, 4), +now.month.slice(5, 7), 1)).toISOString().slice(0, 7),
  );

  const bars = [
    { label: "Came in", cents: inn, color: IN },
    { label: "Went out", cents: out, color: OUT },
  ];

  return (
    <section
      aria-labelledby="leftover"
      className="flex flex-col gap-5 rounded-tile bg-white p-5 ring-1 ring-ink/10"
    >
      <h2 id="leftover" className="text-2xl font-bold">
        {name}
      </h2>

      <div className="flex flex-col gap-3">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
            <span className="text-xl">{b.label}</span>
            <span className="h-9 rounded-r-lg bg-ink/5" aria-hidden>
              <span
                className="block h-full rounded-r-lg"
                style={{ width: `${(b.cents / max) * 100}%`, background: b.color }}
              />
            </span>
            <span className="w-20 text-right text-xl font-bold tabular-nums">
              {dollars(b.cents)}
            </span>
          </div>
        ))}
        <p className="flex flex-wrap items-center justify-end gap-2 tabular-nums">
          <span className="text-lg text-ink-soft">
            {dollars(inn)} − {dollars(out)} =
          </span>
          <span
            className={`rounded-full px-4 py-1 text-2xl font-bold ${diff < 0 ? "bg-blush" : "bg-sage"}`}
          >
            {diff > 0 ? "+" : ""}
            {dollars(diff)}
          </span>
        </p>
      </div>

      {/* The carry-forward: what the café had at the start of the month, and has now. */}
      <div className="flex items-center justify-around gap-3 rounded-2xl bg-cream p-4 text-center">
        <div>
          <p className="text-lg text-ink-soft">Start of {name}</p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-number font-bold tabular-nums">{dollars(start)}</span>
            <StartBalanceButton month={now.month} monthLabel={name} cents={start} />
          </p>
        </div>
        <span aria-hidden className="text-4xl text-ink-soft">
          →
        </span>
        <div>
          <p className="text-lg text-ink-soft">Now</p>
          <p className="text-number font-bold tabular-nums">{dollars(end)}</p>
          <p className="text-base text-ink-soft">Goes into {nextMonth}</p>
        </div>
      </div>
    </section>
  );
}
