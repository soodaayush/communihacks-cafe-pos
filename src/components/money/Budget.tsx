import { BILL_LABEL, monthName, type BudgetMonth } from "@/lib/budget";
import type { ExpenseType } from "@/lib/types";

const BILLS: ExpenseType[] = ["rent", "salary", "inventory", "other"];

// Whole dollars, like the rest of the Money screen: fewer digits to read.
const dollars = (cents: number) =>
  `${cents < 0 ? "−" : ""}$${Math.round(Math.abs(cents) / 100).toLocaleString("en-CA")}`;

/** This month in one sum: what last month left + what came in − what went out = what is left. */
export function Budget({ months }: { months: BudgetMonth[] }) {
  const now = months.at(-1);
  if (!now) return null;
  const before = months.at(-2);
  const nextMonth = monthName(
    new Date(Date.UTC(+now.month.slice(0, 4), +now.month.slice(5, 7), 1)).toISOString().slice(0, 7),
  );

  return (
    <section
      aria-labelledby="budget"
      className="flex flex-col gap-5 rounded-tile bg-white p-5 ring-1 ring-ink/10"
    >
      <h2 id="budget" className="text-2xl font-bold">
        This month: {monthName(now.month)}
      </h2>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xl">
        <dt>{before ? `Left over from ${monthName(before.month)}` : "Money at the start"}</dt>
        <dd className="text-right font-bold tabular-nums">{dollars(now.openingCents)}</dd>
        <dt>Money came in</dt>
        <dd className="text-right font-bold tabular-nums">+ {dollars(now.inCents)}</dd>
        <dt>Money went out</dt>
        <dd className="text-right font-bold tabular-nums">− {dollars(now.outCents)}</dd>
        <div aria-hidden className="col-span-2 border-t border-ink/10" />
        <dt className="self-center font-semibold">Left now</dt>
        <dd className="flex flex-wrap items-center justify-end gap-2 tabular-nums">
          <span className="text-lg text-ink-soft">
            {dollars(now.openingCents)} + {dollars(now.inCents)} − {dollars(now.outCents)} =
          </span>
          <span
            className={`rounded-full px-4 py-1 text-2xl font-bold ${now.closingCents < 0 ? "bg-blush" : "bg-sage"}`}
          >
            {dollars(now.closingCents)}
          </span>
        </dd>
      </dl>
      <p className="-mt-2 text-lg text-ink-soft">This is what you start {nextMonth} with.</p>

      <div>
        {/* Each bill's plan is last month's real spending (see buildMonths in src/lib/budget.ts). */}
        <h3 className="mb-3 text-xl font-semibold">Bills this month</h3>
        <ul className="flex flex-col gap-3">
          {BILLS.map((type) => {
            const spent = now.spentCents[type];
            const plan = now.planCents?.[type];
            if (plan === undefined) {
              return (
                <li key={type} className="flex items-baseline justify-between gap-4 text-lg">
                  <span>{BILL_LABEL[type]}</span>
                  <span>Spent {dollars(spent)}</span>
                </li>
              );
            }
            const left = plan - spent;
            const status =
              left < 0
                ? `Over by ${dollars(-left)}`
                : plan === 0
                  ? "Nothing planned"
                  : left === 0
                    ? "✓ Paid"
                    : `Can still spend ${dollars(left)}`;
            return (
              <li key={type}>
                <p className="flex items-baseline justify-between gap-4 text-lg">
                  <span>{BILL_LABEL[type]}</span>
                  <span className={left < 0 ? "font-bold" : ""}>{status}</span>
                </p>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                  <div
                    className={`h-full rounded-full ${left < 0 ? "bg-blush" : "bg-sage"}`}
                    style={{ width: `${Math.min(100, plan ? (spent / plan) * 100 : 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-base text-ink-soft tabular-nums">
                  Spent {dollars(spent)} of the {dollars(plan)} planned.
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
