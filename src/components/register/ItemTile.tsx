import Image from "next/image";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import { hasSizes } from "@/lib/sizes";
import type { MenuItem } from "@/lib/types";

export interface ItemTileProps {
  item: MenuItem;
  qtyInTray: number;
  onTap: (item: MenuItem) => void;
}

// Picture tint tells drinks from food without reading.
const TINT: Record<string, string> = { drink: "bg-sky/45", food: "bg-butter/55" };

export function ItemTile({ item, qtyInTray, onTap }: ItemTileProps) {
  const soldOut = item.stock - qtyInTray <= 0;
  // Drinks open the size menu; their tile shows the small (lowest) price.
  const price = `${hasSizes(item.category) ? "from " : ""}${formatCents(item.priceCents)}`;
  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      disabled={soldOut}
      aria-label={`${item.name}, ${price}${qtyInTray ? `, ${qtyInTray} in order` : ""}${soldOut ? ", none left" : ""}`}
      className="relative flex flex-col overflow-hidden rounded-tile bg-white text-left shadow-[0_1px_0_rgb(74_74_85/0.08)] ring-1 ring-ink/10 transition-transform disabled:opacity-45 motion-safe:active:scale-[0.97]"
    >
      <span
        className={`flex aspect-[4/3] items-center justify-center ${TINT[item.category] ?? "bg-lavender/50"}`}
      >
        <Image
          src={imageUrl(item.imagePublicId)}
          alt=""
          width={112}
          height={112}
          unoptimized
          className="h-3/4 w-auto"
        />
      </span>
      <span className="flex items-baseline justify-between gap-2 px-4 py-3">
        <span className="text-xl font-semibold">{item.name}</span>
        <span className="text-xl font-bold tabular-nums">{price}</span>
      </span>
      {qtyInTray > 0 && (
        <span className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-ink text-lg font-bold text-white tabular-nums">
          {qtyInTray}
        </span>
      )}
      {soldOut && (
        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 text-base font-semibold">
          None left
        </span>
      )}
    </button>
  );
}
