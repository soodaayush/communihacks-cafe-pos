import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";

export type MoneyRange = "day" | "week" | "month";

export const RANGE_LABEL: Record<MoneyRange, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
};
const ICON: Record<MoneyRange, IconName> = { day: "sun", week: "calendar", month: "chart" };

/** Today / This week / This month as big tabs. Today comes first: the shift they just worked. */
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
          <Icon name={ICON[r]} className="hidden size-7 sm:block" />
          {RANGE_LABEL[r]}
        </Link>
      ))}
    </nav>
  );
}
