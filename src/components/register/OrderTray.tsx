"use client";

import Image from "next/image";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import { sizeLabel } from "@/lib/sizes";
import type { DrinkSize, MenuItem, SaleItem } from "@/lib/types";

export interface OrderTrayProps {
  items: SaleItem[];
  menu: MenuItem[];
  totalCents: number;
  onAdd: (menuItemId: string, size?: DrinkSize) => void;
  onRemove: (menuItemId: string, size?: DrinkSize) => void;
  onClear: () => void;
  onPay: () => void;
}

const stepBtn =
  "flex size-14 items-center justify-center rounded-full bg-cream text-3xl font-bold ring-1 ring-ink/10 disabled:opacity-40";

export function OrderTray({
  items,
  menu,
  totalCents,
  onAdd,
  onRemove,
  onClear,
  onPay,
}: OrderTrayProps) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  return (
    <aside className="flex min-h-[28rem] flex-col rounded-tile bg-white ring-1 ring-ink/10 lg:h-full">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-2xl font-bold">Order</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-12 items-center gap-2 rounded-full bg-blush/60 px-4 text-lg font-semibold"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            >
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
            Clear
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-ink-soft">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-14"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11V5a2 2 0 0 1 4 0v5m0-1a2 2 0 0 1 4 0v2m0-1a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15a2 2 0 0 1 3-2.6L9 14" />
          </svg>
          <p className="text-xl">Tap a picture to add it</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-ink/10 overflow-y-auto px-5">
          {items.map((line) => {
            const item = byId.get(line.menuItemId);
            if (!item) return null;
            // All sizes of a drink share its stock.
            const inOrder = items
              .filter((l) => l.menuItemId === line.menuItemId)
              .reduce((s, l) => s + l.qty, 0);
            const atMax = inOrder >= item.stock;
            const name = line.size ? `${item.name} (${sizeLabel(line.size)})` : item.name;
            return (
              <li
                key={`${line.menuItemId}|${line.size ?? ""}`}
                className="flex items-center gap-3 py-3"
              >
                <Image
                  src={imageUrl(item.imagePublicId, 96)}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{name}</p>
                  <p className="text-base text-ink-soft tabular-nums">
                    {line.qty} × {formatCents(line.unitPriceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRemove(line.menuItemId, line.size)}
                    aria-label={`One less ${name}`}
                    className={stepBtn}
                  >
                    −
                  </button>
                  <span
                    className="w-8 text-center text-2xl font-bold tabular-nums"
                    aria-label={`${line.qty} ${name}`}
                  >
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdd(line.menuItemId, line.size)}
                    disabled={atMax}
                    aria-label={`One more ${name}`}
                    className={stepBtn}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="border-t border-ink/10 px-5 pt-4 pb-5">
        <div className="mb-4 flex items-baseline justify-between" aria-live="polite">
          <span className="text-2xl font-semibold">Total</span>
          <span className="text-number font-bold tabular-nums">{formatCents(totalCents)}</span>
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={items.length === 0}
          className="flex min-h-touch w-full items-center justify-center rounded-tile bg-sage text-3xl font-bold transition-transform disabled:bg-ink/10 disabled:text-ink-soft motion-safe:active:scale-[0.98]"
        >
          Pay
        </button>
      </footer>
    </aside>
  );
}
