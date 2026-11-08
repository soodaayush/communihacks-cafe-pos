import {
  BILL_COLOR,
  BILL_LABEL,
  billsCover,
  dollars,
  forecastMonth,
  monthName,
  type BudgetMonth,
} from "@/lib/budget";
import { cafeDate } from "@/lib/cafe-time";
import type { ExpenseType } from "@/lib/types";

// Paid in this order: the fixed bills first, then what changes.
const ORDER: ExpenseType[] = ["rent", "salary", "inventory", "other"];

/**
 * Break-even as one bar made of this month's bills (rent, wages, stock, other), with a marker for
 * the money that has come in so far. Bills left of the marker are paid for; the rest still to go.
 */
export function BillsCover({ month }: { month: BudgetMonth | undefined }) {
  if (!month) return null;
  const { needCents } = billsCover(month);
  const name = monthName(month.month);

  // Each bill = last month's amount (the plan), or this month's if it already cost more.
  const segs = ORDER.map((t) => ({
    type: t,
    cents: Math.max(month.planCents?.[t] ?? 0, month.spentCents[t]),
  })).filter((s) => s.cents > 0);
  const total = Math.max(1, segs.reduce((a, s) => a + s.cents, 0) || needCents);
  const inCents = month.inCents;
  const toGo = Math.max(0, total - inCents);
  const covered = toGo === 0;
  const marker = Math.min(1, inCents / total);

  // Which bills the money in has paid for, and the next one up.
  let run = 0;
  const paid: string[] = [];
  let next: { label: string; left: number } | null = null;
  for (const s of segs) {
    if (inCents >= run + s.cents) paid.push(BILL_LABEL[s.type]);
    else if (!next) next = { label: BILL_LABEL[s.type], left: run + s.cents - inCents };
    run += s.cents;
  }
  const story = covered
    ? `Sales have paid for every bill this month. The extra ${dollars(inCents - total)} is what the café keeps.`
    : paid.length
      ? `Sales so far have paid for ${paid.join(" and ")}.${next ? ` Next up: ${next.label} (${dollars(next.left)} to go).` : ""}`
      : next
        ? `Sales so far are going toward ${next.label} (${dollars(next.left)} to go).`
        : "";

  // Forecast only for the month we are in (today on the café's clock, like the rest of the Money data).
  const now = cafeDate();
  const isThisMonth = now.slice(0, 7) === month.month;
  const daysInMonth = new Date(
    Date.UTC(+month.month.slice(0, 4), +month.month.slice(5, 7), 0),
  ).getUTCDate();
  const forecast = isThisMonth ? forecastMonth(month, Number(now.slice(8, 10)), daysInMonth) : null;

  return (
    <section
      aria-labelledby="bills-cover"
      className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:col-span-2"
    >
      <h2 id="bills-cover" className="text-2xl font-bold">
        Covering the bills
      </h2>

      <div>
        {/* Marker label above the bar, at the money-in position. */}
        <div className="relative mb-1 h-7">
          <span
            className="absolute -translate-x-1/2 rounded-full bg-ink px-3 py-0.5 text-base font-bold whitespace-nowrap text-white tabular-nums"
            style={{ left: `clamp(4rem, ${marker * 100}%, calc(100% - 4rem))` }}
          >
            {dollars(inCents)} came in
          </span>
        </div>
        <div
          className="relative flex h-12 gap-0.5 overflow-hidden rounded-full bg-ink/10"
          role="img"
          aria-label={`${dollars(inCents)} came in of ${dollars(total)} in bills. ${story}`}
        >
          {segs.map((s, i) => {
            const start = segs.slice(0, i).reduce((a, x) => a + x.cents, 0);
            const paidFor = inCents >= start + s.cents;
            return (
              <div
                key={s.type}
                className="h-full"
                style={{
                  flexGrow: s.cents,
                  flexBasis: 0,
                  background: BILL_COLOR[s.type],
                  opacity: paidFor || inCents > start ? 1 : 0.35,
                }}
                title={`${BILL_LABEL[s.type]}: ${dollars(s.cents)}${paidFor ? " (paid for)" : ""}`}
              />
            );
          })}
          {/* The money-in marker. */}
          <div
            aria-hidden
            className="absolute inset-y-0 w-1 -translate-x-1/2 bg-ink"
            style={{ left: `${marker * 100}%` }}
          />
        </div>
        {/* Bill names under their part of the bar. */}
        <div className="mt-2 flex gap-0.5 text-base">
          {segs.map((s, i) => {
            const start = segs.slice(0, i).reduce((a, x) => a + x.cents, 0);
            const paidFor = inCents >= start + s.cents;
            return (
              <div
                key={s.type}
                className="min-w-0 truncate"
                style={{ flexGrow: s.cents, flexBasis: 0 }}
              >
                <span className={paidFor ? "font-semibold" : "text-ink-soft"}>
                  {paidFor && "✓ "}
                  {BILL_LABEL[s.type]}
                </span>{" "}
                <span className="text-ink-soft tabular-nums">{dollars(s.cents)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-lg">{story}</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span
          className={`rounded-full px-4 py-1 text-xl font-bold tabular-nums ${covered ? "bg-sage/60" : "bg-butter/70"}`}
        >
          {covered ? "✓ All bills covered" : `${dollars(toGo)} to go of ${dollars(total)}`}
        </span>
        {forecast && !covered && (
          <span className="text-lg text-ink-soft">
            {forecast.coverDay
              ? `At this pace, all covered around ${name} ${forecast.coverDay}`
              : `At this pace, not all covered this month`}
          </span>
        )}
      </div>
    </section>
  );
}
