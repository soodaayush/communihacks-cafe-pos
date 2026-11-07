"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { imageUrl } from "@/lib/integrations/cloudinary";
import type { MenuItem } from "@/lib/types";

// Same tints as the register: drinks blue, food yellow.
export const TINT: Record<string, string> = { drink: "bg-sky/45", food: "bg-butter/55" };
const TAB_LABEL: Record<string, string> = { drink: "Drinks", food: "Food" };
const label = (category: string) =>
  TAB_LABEL[category] ?? category.charAt(0).toUpperCase() + category.slice(1);

/**
 * Pick one item, one category at a time. However long the menu gets, the main screen stays the
 * same: the list lives here, in a fixed-size area that scrolls.
 */
export function ItemPicker({
  menu,
  selectedId,
  onPick,
  onClose,
}: {
  menu: MenuItem[];
  selectedId: string;
  onPick: (item: MenuItem) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);

  const categories = [...new Set(menu.map((m) => m.category))];
  const selected = menu.find((m) => m.id === selectedId);
  const [tab, setTab] = useState(selected?.category ?? categories[0]);
  const items = menu.filter((m) => m.category === tab);

  return (
    <dialog
      ref={ref}
      aria-label="Pick an item"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-hidden rounded-[2rem] bg-cream p-6 text-ink backdrop:bg-ink/40 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out sm:p-8 starting:translate-y-8 starting:opacity-0"
    >
      <div className="mb-5 flex items-center gap-3">
        {categories.length > 1 && (
          <div role="tablist" className="flex flex-1 gap-3">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={tab === c}
                onClick={() => setTab(c)}
                className={`min-h-14 flex-1 rounded-full text-xl font-bold motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200 ${tab === c ? `${TINT[c] ?? "bg-lavender/50"} ring-2 ring-ink` : "bg-white ring-1 ring-ink/10"}`}
              >
                {label(c)}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-3xl ring-1 ring-ink/10"
        >
          ×
        </button>
      </div>

      {/* Fixed height: the dialog never changes size between tabs or menus. Long lists scroll. */}
      <div className="h-[min(26rem,calc(100dvh-12rem))] overflow-y-auto p-1">
        <div key={tab} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => {
            const isSelected = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m)}
                aria-pressed={isSelected}
                className={`flex flex-col overflow-hidden rounded-tile bg-white text-left motion-safe:transition-[box-shadow,scale] motion-safe:duration-200 motion-safe:active:scale-[0.97] ${isSelected ? "ring-4 ring-ink" : "ring-1 ring-ink/10"}`}
              >
                <span
                  className={`flex h-24 items-center justify-center ${TINT[m.category] ?? "bg-lavender/50"}`}
                >
                  <Image
                    src={imageUrl(m.imagePublicId)}
                    alt=""
                    width={72}
                    height={72}
                    unoptimized
                    className="h-20 w-auto"
                  />
                </span>
                <span className="px-3 py-2 text-lg leading-tight font-semibold">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
