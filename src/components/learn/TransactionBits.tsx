import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { imageUrl } from "@/lib/images";
import { lineLabel, type LearnLine, type LearnTransaction } from "@/lib/learn";

// Same tints as the register: drinks blue, food yellow.
const TINT: Record<string, string> = { drink: "bg-sky/45", food: "bg-butter/55" };

/**
 * What was bought, as small pictures. A number badge shows when there is more than one of a thing.
 * The row has room for three pictures: a bigger order shows two and "+N" for the rest, so a
 * picture is never cut in half.
 */
export function ItemChips({
  lines,
  max = 3,
  size = "md",
}: {
  lines: LearnLine[];
  /** How many pictures fit. A longer list shows one fewer and "+N". */
  max?: number;
  size?: "md" | "lg";
}) {
  const shown = lines.length <= max ? lines : lines.slice(0, max - 1);
  const extra = lines.length - shown.length;
  const box = size === "lg" ? "size-12 sm:size-16" : "size-10 sm:size-12";
  const img = size === "lg" ? "size-10 sm:size-[52px]" : "size-8 sm:size-10";
  return (
    <span className="flex items-center gap-2" aria-hidden>
      {shown.map((l, i) => (
        <span
          key={`${l.menuItemId}:${l.size ?? ""}:${i}`}
          title={lineLabel(l)}
          className={`relative flex shrink-0 items-center justify-center rounded-xl ${box} ${TINT[l.category] ?? "bg-lavender/50"}`}
        >
          <Image
            src={imageUrl(l.imagePublicId)}
            alt=""
            width={52}
            height={52}
            unoptimized
            className={img}
          />
          {l.qty > 1 && (
            <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-ink text-sm font-bold text-white tabular-nums">
              {l.qty}
            </span>
          )}
        </span>
      ))}
      {extra > 0 && <span className="text-lg font-bold text-ink-soft tabular-nums">+{extra}</span>}
    </span>
  );
}

/** Cash (coin) or Card (receipt), as a small icon and a word. */
export function PaymentLabel({ method }: { method: LearnTransaction["paymentMethod"] }) {
  return (
    <span className="flex items-center gap-1.5 text-base text-ink-soft">
      <Icon name={method === "cash" ? "coin" : "receipt"} className="size-5" />
      {method === "cash" ? "Cash" : "Card"}
    </span>
  );
}
