import { MoneyPiece, denomLabel } from "@/components/register/Cash";
import { breakdown } from "@/lib/cash";

export interface CoinBarVisualProps {
  cents: number;
  variant: "coins" | "bar";
  tone?: "in" | "out" | "left";
  /** Bar only: the amount that fills the whole bar. */
  maxCents?: number;
}

const TONE_BG = { in: "bg-money-in", out: "bg-money-out", left: "bg-money-left" } as const;
const MAX_PIECES = 8;

// Shows an amount as real bills and coins, or as a bar sized by the amount. No equations.
export function CoinBarVisual({ cents, variant, tone = "left", maxCents }: CoinBarVisualProps) {
  if (variant === "bar") {
    const pct = maxCents && maxCents > 0 ? Math.min(Math.max(cents / maxCents, 0), 1) * 100 : 0;
    return (
      <span aria-hidden className="block h-8 w-full overflow-hidden rounded-full bg-ink/10">
        <span
          className={`block h-full rounded-full ${TONE_BG[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    );
  }

  const pieces = breakdown(Math.max(cents, 0));
  if (pieces.length === 0) return <span className="text-xl text-ink-soft">Nothing</span>;
  const shown = pieces.slice(0, MAX_PIECES);
  return (
    <span
      className="flex flex-wrap items-center gap-2"
      aria-label={pieces.map(denomLabel).join(", ")}
    >
      {shown.map((d, i) => (
        <MoneyPiece key={i} cents={d} />
      ))}
      {pieces.length > shown.length && <span className="text-xl font-bold">…</span>}
    </span>
  );
}
