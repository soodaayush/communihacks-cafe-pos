import { SpeakButton } from "@/components/voice/SpeakButton";
import { MiniJar, MoneyBar, Person } from "./pictures";
import { formatDollars } from "@/lib/money";

export interface MoneyInOutLeftProps {
  /** "Today" or "This week" */
  label: string;
  /** What customers paid. */
  inCents: number;
  /** What the things they bought cost to make. */
  costCents: number;
}

/** A cup and a bag: "the food and cups you used". */
export function CostIcon({ className = "size-9" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#4a4a55"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M4 9h9l-1 11H5z" fill="#fffdf9" />
      <path d="M13 11h2a2 2 0 0 1 0 4h-2.5" />
      <path d="M15 4h5l-1 6h-3z" fill="#f3e3ad" />
    </svg>
  );
}

/**
 * The core lesson, as one picture: all the money customers paid is
 * one bar. The pink part paid for making what they bought; the green part is what you keep.
 * Whole dollars only. Rent and wages are a staff topic (see StaffBills).
 */
export function MoneyInOutLeft({ label, inCents, costCents }: MoneyInOutLeftProps) {
  // Round the total and the cost to whole dollars first, then subtract, so the shown parts
  // always add up exactly ($199 + $419 = $618). A $1 mismatch would confuse someone learning.
  const toDollar = (c: number) => Math.round(c / 100) * 100;
  inCents = toDollar(inCents);
  costCents = toDollar(costCents);
  const kept = inCents - costCents;
  const say =
    inCents === 0
      ? `${label}, nobody has bought anything yet.`
      : `${label}, customers paid you ${formatDollars(inCents)}. ${formatDollars(costCents)} paid for making what they bought. You keep ${formatDollars(kept)}.`;

  return (
    <section className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <div className="flex items-center gap-4">
        <h2 className="flex-1 text-2xl font-bold">Money {label.toLowerCase()}</h2>
        <SpeakButton text={say} />
      </div>

      <div className="flex items-center gap-3">
        <Person className="size-9" />
        <p className="flex-1 text-xl">Customers paid you</p>
        <p className="text-4xl font-bold tabular-nums">{formatDollars(inCents)}</p>
      </div>

      <MoneyBar
        scale={Math.max(inCents, 1)}
        parts={[
          { cents: costCents, className: "bg-blush", icon: <CostIcon /> },
          { cents: kept, className: "bg-sage", label: formatDollars(kept), icon: <MiniJar /> },
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-blush/40 p-3">
          <CostIcon className="size-9 shrink-0" />
          <p className="flex-1">
            <span className="block text-base sm:text-lg">Cost to make it</span>
            <span className="text-2xl font-bold tabular-nums">{formatDollars(costCents)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-sage/50 p-3">
          <MiniJar className="size-9 shrink-0" />
          <p className="flex-1">
            <span className="block text-base sm:text-lg">You keep</span>
            <span className="text-2xl font-bold tabular-nums">{formatDollars(kept)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
