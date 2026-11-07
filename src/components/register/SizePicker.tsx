"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import { SIZES, sizePriceCents } from "@/lib/sizes";
import type { DrinkSize, MenuItem } from "@/lib/types";

export interface SizePickerProps {
  item: MenuItem;
  onPick: (size: DrinkSize) => void;
  onClose: () => void;
}

// The drink picture grows with the size, so the choice reads without words too.
const PICTURE_PX: Record<DrinkSize, number> = { S: 56, M: 76, L: 96 };

export function SizePicker({ item, onPick, onClose }: SizePickerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog
      ref={ref}
      aria-label={`Pick a size for ${item.name}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(44rem,calc(100vw-2rem))] rounded-[2rem] bg-cream p-6 text-ink backdrop:bg-ink/40 sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold">{item.name}</h2>
          <SpeakButton
            text={`Choose a size for ${item.name}: Small, Medium, or Large.`}
            size="md"
            label={`Hear size instructions for ${item.name}`}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-14 items-center justify-center rounded-full bg-white text-3xl ring-1 ring-ink/10"
        >
          ×
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {SIZES.map(({ size, label }) => {
          const price = sizePriceCents(item.priceCents, size);
          return (
            <div
              key={size}
              className="relative flex flex-col items-center justify-end rounded-tile bg-white px-4 pt-5 pb-4 ring-1 ring-ink/10 shadow-sm"
            >
              <button
                type="button"
                onClick={() => onPick(size)}
                className="flex w-full flex-col items-center justify-end gap-3 transition-transform motion-safe:active:scale-[0.97]"
              >
                <span className="flex h-24 items-end">
                  <Image
                    src={imageUrl(item.imagePublicId)}
                    alt=""
                    width={PICTURE_PX[size]}
                    height={PICTURE_PX[size]}
                    unoptimized
                    style={{ width: PICTURE_PX[size], height: PICTURE_PX[size] }}
                  />
                </span>
                <span className="text-2xl font-bold">{label}</span>
                <span className="text-number font-bold tabular-nums">
                  {formatCents(price)}
                </span>
              </button>
              <div className="mt-2">
                <SpeakButton
                  text={`${label} ${item.name}, ${formatCents(price)}`}
                  size="sm"
                  label={`Listen to ${label} price`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </dialog>
  );
}
