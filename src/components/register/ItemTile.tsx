import Image from "next/image";
import { SpeakButton } from "@/components/voice/SpeakButton";
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
  // Drinks open the size menu, so their tile shows a ">" instead of a price.
  const sized = hasSizes(item.category);
  const price = formatCents(item.priceCents);
  const spokenDescription = `${item.name}. ${sized ? "Drink, choose a size" : `${price}`}${soldOut ? ", sold out" : ""}`;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-tile bg-white text-left shadow-[0_1px_0_rgb(74_74_85/0.08)] ring-1 ring-ink/10">
      <button
        type="button"
        onClick={() => onTap(item)}
        disabled={soldOut}
        aria-label={`${item.name}, ${sized ? "pick a size" : price}${qtyInTray ? `, ${qtyInTray} in order` : ""}${soldOut ? ", none left" : ""}`}
        className="flex flex-1 flex-col text-left transition-transform disabled:opacity-45 motion-safe:active:scale-[0.97]"
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
        <span className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-xl font-semibold">{item.name}</span>
          <span className="flex items-center gap-1 text-xl font-bold tabular-nums">
            {/* Drinks show only ">": each size's price is in the size menu. */}
            {!sized && price}
            {sized && (
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-7 text-ink-soft"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            )}
          </span>
        </span>
      </button>

      {/* Speaker button to hear the item name and price */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2">
        {qtyInTray > 0 && (
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-base font-bold text-white tabular-nums">
            {qtyInTray}
          </span>
        )}
        <SpeakButton
          text={spokenDescription}
          size="sm"
          label={`Listen to ${item.name}`}
          className="shadow-sm"
        />
      </div>

      {soldOut && (
        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 text-base font-semibold shadow-sm">
          None left
        </span>
      )}
    </div>
  );
}
