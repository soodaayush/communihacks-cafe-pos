"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BuyResult } from "@/app/api/supplies/buy/route";
import { Icon } from "@/components/icons/Icon";
import { pictureOf } from "@/components/icons/supplyPicture";
import type { InventoryItem } from "@/lib/types";
import { packNote, unitOf } from "@/lib/units";
import { money } from "./BoughtList";

const MAX = 99;

/** "We bought…": tap the picture, then how many. The cost fills in by itself. */
export function BuySheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  /** Called with what the server says after a purchase, e.g. the new stock count. */
  onSaved?: (result: BuyResult) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [picked, setPicked] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    fetch("/api/supplies")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: InventoryItem[]) =>
        setItems([...list].sort((a, b) => a.name.localeCompare(b.name))),
      )
      .catch(() => setLoadFailed(true));
  }, []);

  async function save() {
    if (!picked || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const r = await fetch("/api/supplies/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryItemId: picked.id, qty }),
      });
      if (!r.ok) throw new Error();
      onSaved?.((await r.json()) as BuyResult);
      router.refresh();
      ref.current?.close();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const round =
    "flex size-touch shrink-0 items-center justify-center rounded-full bg-cream text-4xl font-bold ring-1 ring-ink/15 disabled:opacity-40";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="buy-title"
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-tile bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Icon name="cart" className="size-12" />
          <h2 id="buy-title" className="flex-1 text-2xl font-bold">
            {picked ? picked.name : "What did we buy?"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="flex size-14 items-center justify-center rounded-full bg-cream text-3xl ring-1 ring-ink/10"
          >
            ×
          </button>
        </div>

        {!picked ? (
          <div className="grid h-[22rem] auto-rows-max grid-cols-3 gap-3 overflow-y-auto p-1">
            {loadFailed ? (
              <p className="col-span-3 m-auto text-lg">Could not load. Close and try again.</p>
            ) : !items ? (
              <p className="col-span-3 m-auto text-lg text-ink-soft">Loading…</p>
            ) : (
              items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => {
                    setPicked(i);
                    setQty(1);
                  }}
                  className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-cream ring-1 ring-ink/10 motion-safe:active:scale-[0.97]"
                >
                  <Icon name={pictureOf(i)} className="size-12" />
                  <span className="text-base leading-tight font-semibold">{i.name}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="flex h-[22rem] flex-col justify-center gap-6">
            <div className="flex justify-center">
              <Icon name={pictureOf(picked)} className="size-20" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="One less"
                disabled={saving || qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className={round}
              >
                −
              </button>
              <p className="flex flex-1 flex-col items-center">
                <span className="text-hero leading-none font-bold tabular-nums">{qty}</span>
                <span className="text-lg text-ink-soft">{unitOf(qty, picked.packName)}</span>
                {packNote(picked) && (
                  <span className="text-base text-ink-soft">({packNote(picked)})</span>
                )}
              </p>
              <button
                type="button"
                aria-label="One more"
                disabled={saving || qty >= MAX}
                onClick={() => setQty((q) => Math.min(MAX, q + 1))}
                className={round}
              >
                +
              </button>
            </div>
            <p className="flex items-center justify-center gap-3 rounded-2xl bg-blush/50 py-3 text-3xl font-bold tabular-nums">
              <Icon name="cart" className="size-8" />
              {money(qty * picked.unitCostCents)}
            </p>
          </div>
        )}

        <p role="alert" className="h-7 text-center text-lg">
          {failed ? "Not saved. Try again." : ""}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => (picked ? setPicked(null) : ref.current?.close())}
            className="min-h-touch rounded-tile bg-cream text-xl font-semibold ring-1 ring-ink/15"
          >
            {picked ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!picked || saving}
            onClick={save}
            className="flex min-h-touch items-center justify-center gap-2 rounded-tile bg-sage text-xl font-bold disabled:opacity-40"
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <Icon name="check" className="size-6" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
