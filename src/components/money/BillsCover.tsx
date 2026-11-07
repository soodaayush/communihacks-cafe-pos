import { billsCover, dollars, forecastMonth, monthName, type BudgetMonth } from "@/lib/budget";

/** Break-even in plain words: have this month's sales paid for this month's bills yet? */
export function BillsCover({ month }: { month: BudgetMonth | undefined }) {
  if (!month) return null;
  const { needCents, toGoCents, extraCents } = billsCover(month);
  const covered = toGoCents === 0;
  const pct = needCents ? Math.min(100, (month.inCents / needCents) * 100) : 100;

  // Forecast only for the month we are in (today's UTC date, like the rest of the Money data).
  const now = new Date();
  const isThisMonth = now.toISOString().slice(0, 7) === month.month;
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const forecast = isThisMonth ? forecastMonth(month, now.getUTCDate(), daysInMonth) : null;
  const name = monthName(month.month);

  return (
    <section
      aria-labelledby="bills-cover"
      className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10"
    >
      <h2 id="bills-cover" className="text-2xl font-bold">
        Covering the bills
      </h2>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xl">
        <dt>{monthName(month.month)}&apos;s bills will cost about</dt>
        <dd className="text-right font-bold tabular-nums">{dollars(needCents)}</dd>
        <dt>Money came in so far</dt>
        <dd className="text-right font-bold tabular-nums">{dollars(month.inCents)}</dd>
      </dl>

      <div className="h-5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <div
          className={`h-full rounded-full ${covered ? "bg-sage" : "bg-butter"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {covered ? (
        <p className="rounded-2xl bg-sage/50 p-4 text-xl">
          <strong>✓ All the bills are covered.</strong> The extra{" "}
          <strong className="tabular-nums">{dollars(extraCents)}</strong> is what the café keeps.
        </p>
      ) : (
        <p className="rounded-2xl bg-butter/50 p-4 text-xl">
          <strong className="tabular-nums">{dollars(toGoCents)}</strong> more to cover all the
          bills.
          <span className="mt-1 block text-lg text-ink-soft tabular-nums">
            {dollars(needCents)} − {dollars(month.inCents)} = {dollars(toGoCents)}
          </span>
        </p>
      )}

      {forecast && (
        <div>
          <h3 className="mb-2 text-xl font-semibold">At this pace</h3>
          <ul className="flex flex-col gap-1 text-lg">
            <li>
              You take in about{" "}
              <strong className="tabular-nums">{dollars(forecast.paceCents)}</strong> a day.
            </li>
            <li>
              By the end of {name}: about{" "}
              <strong className="tabular-nums">{dollars(forecast.projectedCents)}</strong>.
            </li>
            {!covered && (
              <li>
                {forecast.coverDay
                  ? `The bills should be covered around ${name} ${forecast.coverDay}.`
                  : `At this pace, the bills won't all be covered this month.`}
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
