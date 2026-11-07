import Link from "next/link";

export type MoneyRange = "day" | "week";

export const RANGE_LABEL: Record<MoneyRange, string> = {
  day: "Today",
  week: "This week",
};
const ICON: Record<MoneyRange, string> = { day: "☀️", week: "🗓️" };

/** Today / This week, styled like the What-if tabs. Today comes first: the shift they just worked. */
export function RangeTabs({ range }: { range: MoneyRange }) {
  return (
    <nav aria-label="Time" className="flex shrink-0 gap-3">
      {(Object.keys(RANGE_LABEL) as MoneyRange[]).map((r) => (
        <Link
          key={r}
          href={r === "day" ? "/money" : `/money?range=${r}`}
          aria-current={r === range ? "page" : undefined}
          className={`flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full text-lg font-bold motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 sm:flex-none sm:px-6 sm:text-xl ${r === range ? "bg-white ring-2 ring-ink" : "bg-white/50 ring-1 ring-ink/10"}`}
        >
          <span aria-hidden className="hidden sm:inline">
            {ICON[r]}
          </span>
          {RANGE_LABEL[r]}
        </Link>
      ))}
    </nav>
  );
}
