import { billsCover, dollars, forecastMonth, monthName, type BudgetMonth } from "@/lib/budget";

const COVERED = "#93c6a3"; // muted money-in green
const TO_GO = "#e6c97a"; // muted butter: "not there yet"
const INK = "#4a4a55";

/** Break-even as a ring, plus a line of money in across the month with the pace to month end. */
export function BillsCover({ month }: { month: BudgetMonth | undefined }) {
  if (!month) return null;
  const { needCents, toGoCents, extraCents } = billsCover(month);
  const covered = toGoCents === 0;
  const share = needCents ? Math.min(1, month.inCents / needCents) : 1;
  const name = monthName(month.month);

  // Forecast only for the month we are in (today's UTC date, like the rest of the Money data).
  const now = new Date();
  const isThisMonth = now.toISOString().slice(0, 7) === month.month;
  const daysInMonth = new Date(
    Date.UTC(+month.month.slice(0, 4), +month.month.slice(5, 7), 0),
  ).getUTCDate();
  const today = isThisMonth ? now.getUTCDate() : daysInMonth;
  const forecast = isThisMonth ? forecastMonth(month, today, daysInMonth) : null;

  // Running total of money in, day by day.
  const running: number[] = [];
  for (let d = 0; d < today; d++)
    running.push((running[d - 1] ?? 0) + (month.dailyInCents[d] ?? 0));

  // Line chart geometry.
  const W = 900;
  const H = 210;
  const L = 8;
  const RIGHT = W - 8;
  const TOP = 24;
  const BASE = 180;
  const yMax = Math.max(needCents, forecast?.projectedCents ?? 0, month.inCents, 1) * 1.08;
  const px = (day: number) => L + ((day - 1) / Math.max(1, daysInMonth - 1)) * (RIGHT - L);
  const py = (cents: number) => BASE - (cents / yMax) * (BASE - TOP);
  const actual = running.map((c, i) => `${px(i + 1)},${py(c)}`).join(" ");
  const ring = 2 * Math.PI * 52;

  return (
    <section
      aria-labelledby="bills-cover"
      className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10 lg:col-span-2"
    >
      <h2 id="bills-cover" className="text-2xl font-bold">
        Covering the bills
      </h2>

      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        {/* Ring: how much of the bills the money in has paid for. */}
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="0 0 130 130"
            className="size-44"
            role="img"
            aria-label={`${dollars(month.inCents)} of ${dollars(needCents)} in bills`}
          >
            <circle
              cx="65"
              cy="65"
              r="52"
              fill="none"
              stroke={INK}
              strokeOpacity=".1"
              strokeWidth="16"
            />
            <circle
              cx="65"
              cy="65"
              r="52"
              fill="none"
              stroke={covered ? COVERED : TO_GO}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${share * ring} ${ring}`}
              transform="rotate(-90 65 65)"
            />
            <text x="65" y="64" textAnchor="middle" className="fill-ink text-[22px] font-bold">
              {dollars(month.inCents)}
            </text>
            <text x="65" y="84" textAnchor="middle" className="fill-ink-soft text-[12px]">
              of {dollars(needCents)}
            </text>
          </svg>
          <p
            className={`rounded-full px-4 py-1 text-lg font-semibold ${covered ? "bg-sage/60" : "bg-butter/70"}`}
          >
            {covered ? `✓ Covered, ${dollars(extraCents)} extra` : `${dollars(toGoCents)} to go`}
          </p>
        </div>

        {/* Line: money in so far (solid), at this pace (dashed), and the bills to beat. */}
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="max-h-72 w-full"
            role="img"
            aria-label={
              forecast
                ? `At this pace about ${dollars(forecast.projectedCents)} by the end of ${name}`
                : `Money in during ${name}`
            }
          >
            <line
              x1={L}
              x2={RIGHT}
              y1={BASE}
              y2={BASE}
              stroke={INK}
              strokeOpacity=".2"
              strokeWidth="2"
            />
            <line
              x1={L}
              x2={RIGHT}
              y1={py(needCents)}
              y2={py(needCents)}
              stroke="#e09a92"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            <text x={L} y={py(needCents) - 8} className="fill-ink text-[14px] font-semibold">
              Bills {dollars(needCents)}
            </text>
            {forecast && (
              <line
                x1={px(today)}
                y1={py(month.inCents)}
                x2={px(daysInMonth)}
                y2={py(forecast.projectedCents)}
                stroke={INK}
                strokeOpacity=".55"
                strokeWidth="3"
                strokeDasharray="7 6"
              />
            )}
            <polyline
              points={actual}
              fill="none"
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx={px(today)} cy={py(month.inCents)} r="5" fill={INK}>
              <title>{`Money in so far: ${dollars(month.inCents)}`}</title>
            </circle>
            {forecast && (
              <>
                <circle
                  cx={px(daysInMonth)}
                  cy={py(forecast.projectedCents)}
                  r="5"
                  fill="#fff"
                  stroke={INK}
                  strokeWidth="2.5"
                >
                  <title>{`About ${dollars(forecast.projectedCents)} by ${name} ${daysInMonth}`}</title>
                </circle>
                <text
                  x={px(daysInMonth)}
                  y={py(forecast.projectedCents) - 12}
                  textAnchor="end"
                  className="fill-ink text-[14px] font-bold"
                >
                  ~{dollars(forecast.projectedCents)}
                </text>
              </>
            )}
            {forecast?.coverDay && !covered && (
              <g>
                <title>{`Bills covered around ${name} ${forecast.coverDay}`}</title>
                <circle
                  cx={px(forecast.coverDay)}
                  cy={py(needCents)}
                  r="6"
                  fill={COVERED}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={px(forecast.coverDay)}
                  y={py(needCents) + 24}
                  textAnchor="middle"
                  className="fill-ink text-[14px] font-semibold"
                >
                  {name.slice(0, 3)} {forecast.coverDay}
                </text>
              </g>
            )}
            <text x={L} y={H - 6} className="fill-ink-soft text-[13px]">
              {name.slice(0, 3)} 1
            </text>
            <text x={RIGHT} y={H - 6} textAnchor="end" className="fill-ink-soft text-[13px]">
              {name.slice(0, 3)} {daysInMonth}
            </text>
          </svg>
          <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-base text-ink-soft">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-[3px] w-6 bg-ink" /> So far
            </span>
            {forecast && (
              <span className="flex items-center gap-2">
                <span aria-hidden className="w-6 border-t-[3px] border-dashed border-ink/55" /> At
                this pace (~{dollars(forecast.paceCents)} a day)
              </span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
