import { Icon } from "@/components/icons/Icon";

// A simple bar chart: numbers up the side, faint lines across, the value on top of every bar, and a
// label underneath. The tallest bar is marked with a star (so it is not only a different colour).

export interface Bar {
  label: string;
  value: number;
  /** Mark this bar (e.g. the busiest). */
  highlight?: boolean;
}

/** A round number to stop the side scale at, and the step between lines (about 4 lines). */
function scale(max: number): { top: number; step: number } {
  // Leave a little room above the tallest bar for its number (and star).
  const rough = (Math.max(max, 1) * 1.15) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((m) => rough <= m * magnitude) ?? 10) * magnitude;
  return { top: Math.ceil((Math.max(max, 1) * 1.15) / step) * step, step };
}

export function BarChart({
  bars,
  format = String,
  label,
}: {
  bars: Bar[];
  /** How a number is written on the side and on the bars, e.g. (n) => `$${n}`. */
  format?: (n: number) => string;
  /** What the chart is, for screen readers. */
  label: string;
}) {
  const { top, step } = scale(Math.max(...bars.map((b) => b.value)));
  const lines = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  return (
    <figure aria-label={label} className="flex flex-col pt-5 lg:min-h-0 lg:flex-1">
      <div className="flex h-56 gap-2 lg:h-auto lg:min-h-40 lg:flex-1">
        {/* The numbers up the side. */}
        <div aria-hidden className="relative w-12 shrink-0 text-sm text-ink-soft tabular-nums">
          {lines.map((n) => (
            <span
              key={n}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(n / top) * 100}%` }}
            >
              {format(n)}
            </span>
          ))}
        </div>
        {/* The bars, with faint lines behind them. */}
        <div className="relative flex-1 border-b-2 border-l-2 border-ink/25">
          {lines.slice(1).map((n) => (
            <div
              key={n}
              aria-hidden
              className="absolute inset-x-0 border-t border-ink/10"
              style={{ bottom: `${(n / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-2 px-2">
            {bars.map((b) => (
              <div key={b.label} className="relative flex h-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md ${b.highlight ? "bg-sage" : "bg-sky"}`}
                  style={{ height: `${(b.value / top) * 100}%`, minHeight: b.value > 0 ? 3 : 0 }}
                />
                <span
                  className="absolute inset-x-0 flex flex-col items-center text-sm font-bold tabular-nums"
                  style={{ bottom: `calc(${(b.value / top) * 100}% + 3px)` }}
                >
                  {b.highlight && <Icon name="star" className="size-5" />}
                  {format(b.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* The labels underneath each bar. */}
      <div aria-hidden className="mt-1 flex gap-2 pr-0 pl-14 text-sm text-ink-soft">
        <div className="flex flex-1 gap-2 px-2">
          {bars.map((b) => (
            <span key={b.label} className="flex-1 text-center">
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
