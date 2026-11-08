import { BILL_COLOR, BILL_LABEL, dollars, type BudgetMonth } from "@/lib/budget";
import type { ExpenseType } from "@/lib/types";

// This order keeps neighbouring slices easy to tell apart (see BILL_COLOR).
const BILLS: ExpenseType[] = ["rent", "salary", "other", "inventory"];
const C = 90; // centre
const R = 84; // outer radius
const r = 54; // inner radius (the hole)

/** One donut slice from angle a0 to a1 (radians, clockwise from 12 o'clock). */
function slice(a0: number, a1: number): string {
  const pt = (rad: number, a: number) => `${C + rad * Math.sin(a)} ${C - rad * Math.cos(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(R, a0)}A${R} ${R} 0 ${large} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${large} 0 ${pt(r, a0)}Z`;
}

/** Where this month's money went, as a donut, with each bill's amount and plan status. */
export function BillsDonut({ month }: { month: BudgetMonth | undefined }) {
  if (!month) return null;
  const total = BILLS.reduce((s, t) => s + month.spentCents[t], 0);

  let angle = 0;
  const arcs = BILLS.filter((t) => month.spentCents[t] > 0).map((t) => {
    const share = month.spentCents[t] / total;
    const a0 = angle;
    angle += share * 2 * Math.PI;
    return { type: t, a0, a1: angle, share };
  });

  return (
    <section
      aria-labelledby="bills-donut"
      className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10"
    >
      <h2 id="bills-donut" className="text-2xl font-bold">
        Where the money went
      </h2>
      <div className="flex flex-wrap items-center gap-6">
        <svg
          viewBox="0 0 180 180"
          className="size-44 shrink-0"
          role="img"
          aria-label={`Bills: ${dollars(total)} in total`}
        >
          {total === 0 ? (
            <circle
              cx={C}
              cy={C}
              r={(R + r) / 2}
              fill="none"
              stroke="#4a4a55"
              strokeOpacity=".1"
              strokeWidth={R - r}
            />
          ) : (
            arcs.map((a) =>
              a.share > 0.9999 ? (
                <circle
                  key={a.type}
                  cx={C}
                  cy={C}
                  r={(R + r) / 2}
                  fill="none"
                  stroke={BILL_COLOR[a.type]}
                  strokeWidth={R - r}
                >
                  <title>{`${BILL_LABEL[a.type]}: ${dollars(month.spentCents[a.type])}`}</title>
                </circle>
              ) : (
                // white stroke = the 2px gap between slices
                <path
                  key={a.type}
                  d={slice(a.a0, a.a1)}
                  fill={BILL_COLOR[a.type]}
                  stroke="#fff"
                  strokeWidth="2"
                >
                  <title>{`${BILL_LABEL[a.type]}: ${dollars(month.spentCents[a.type])}`}</title>
                </path>
              ),
            )
          )}
          <text x={C} y={C + 2} textAnchor="middle" className="fill-ink text-[26px] font-bold">
            {dollars(total)}
          </text>
          <text x={C} y={C + 24} textAnchor="middle" className="fill-ink-soft text-[14px]">
            spent
          </text>
        </svg>

        {/* Legend doubles as the table: colour, name, amount, and how it compares with the plan. */}
        <ul className="flex min-w-48 flex-1 flex-col gap-3 text-lg">
          {BILLS.map((t) => {
            const spent = month.spentCents[t];
            const plan = month.planCents?.[t];
            const left = plan === undefined ? undefined : plan - spent;
            const status =
              left === undefined || plan === 0
                ? null
                : left < 0
                  ? `Over by ${dollars(-left)}`
                  : left === 0
                    ? "✓ Paid"
                    : `${dollars(left)} left`;
            return (
              <li key={t} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded-md"
                  style={{ background: BILL_COLOR[t] }}
                />
                <span className="flex-1">{BILL_LABEL[t]}</span>
                <span className="text-right tabular-nums">
                  <strong>{dollars(spent)}</strong>
                  {status && (
                    <span
                      className={`block text-base ${left! < 0 ? "font-bold" : "text-ink-soft"}`}
                    >
                      {status}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
