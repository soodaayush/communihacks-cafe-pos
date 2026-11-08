import type { Denom } from "@/lib/cash";

// Bills use their real Canadian colours, which happen to match our pastel tokens.
const BILL: Partial<Record<Denom, string>> = {
  500: "bg-sky",
  1000: "bg-lavender",
  2000: "bg-sage",
  5000: "bg-blush",
};
// Coins keep their real size order: dime < nickel < quarter < loonie < toonie.
const COIN_PX: Partial<Record<Denom, number>> = { 5: 50, 10: 44, 25: 56, 100: 62, 200: 66 };

export const denomLabel = (d: Denom) => (d >= 100 ? `$${d / 100}` : `${d}¢`);

/** A picture of one bill or coin. Decorative: the button or list around it carries the label. */
export function MoneyPiece({ cents }: { cents: Denom }) {
  const label = denomLabel(cents);
  if (cents >= 500) {
    return (
      <span
        aria-hidden
        className={`inline-flex h-14 w-28 shrink-0 items-center justify-between rounded-lg border-2 border-ink/40 px-3 text-xl font-bold ${BILL[cents]}`}
      >
        <span className="size-6 rounded-full border-2 border-ink/20" />
        {label}
      </span>
    );
  }
  const metal =
    cents === 100
      ? "bg-[#e9d496]"
      : cents === 200
        ? "bg-[#e9d496] shadow-[inset_0_0_0_7px_#d9dce1]"
        : "bg-[#d9dce1]";
  const px = COIN_PX[cents];
  return (
    <span
      aria-hidden
      style={{ width: px, height: px }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink/15 text-base font-bold ${metal}`}
    >
      {label}
    </span>
  );
}
