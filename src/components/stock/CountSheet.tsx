"use client";

import { useEffect, useRef, useState } from "react";

export interface CountSheetProps {
  name: string;
  /** Picture for the item (an <Image> or an emoji). */
  picture: React.ReactNode;
  /** Word shown under the number, e.g. "left", "bags". */
  unit: string;
  /** What the system says there is now. */
  current: number;
  /** Called with the new count. Reject to show the "could not save" message. */
  onSave: (count: number) => Promise<void>;
  onClose: () => void;
}

const MAX = 99_999;

// "How many are there?" Big − and + buttons, or type the number. Native <dialog> gives us the
// backdrop, focus handling and the Escape key.
export function CountSheet({ name, picture, unit, current, onSave, onClose }: CountSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const parsed = text.trim() === "" ? NaN : Number(text);
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX;
  const count = valid ? parsed : current;
  const step = (by: number) => setText(String(Math.min(MAX, Math.max(0, count + by))));

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await onSave(count);
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
      aria-labelledby="count-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-tile bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center text-5xl">{picture}</span>
          <div>
            <h2 id="count-title" className="text-2xl font-bold">
              {name}
            </h2>
            <p className="text-lg text-ink-soft">How many are there?</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="One less"
            disabled={saving || count <= 0}
            onClick={() => step(-1)}
            className={round}
          >
            −
          </button>
          <label className="flex flex-1 flex-col items-center">
            <span className="sr-only">Number of {name}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX}
              value={text}
              disabled={saving}
              onChange={(e) => setText(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-tile bg-cream py-2 text-center text-hero font-bold tabular-nums ring-1 ring-ink/15"
            />
            <span className="mt-1 text-lg text-ink-soft">{unit}</span>
          </label>
          <button
            type="button"
            aria-label="One more"
            disabled={saving || count >= MAX}
            onClick={() => step(1)}
            className={round}
          >
            +
          </button>
        </div>

        <p className="text-center text-lg text-ink-soft">
          Before: {current}
          {valid && count !== current && (
            <span className="font-semibold text-ink"> → Now: {count}</span>
          )}
        </p>
        {!valid && <p className="text-center text-lg text-ink">Type a whole number, like 12.</p>}
        {failed && (
          <p role="alert" className="rounded-tile bg-blush p-3 text-center text-lg">
            Could not save. Try again.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => ref.current?.close()}
            className="min-h-touch rounded-tile bg-cream text-xl font-semibold ring-1 ring-ink/15"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || saving || count === current}
            onClick={save}
            className="min-h-touch rounded-tile bg-sage text-xl font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "✓ Save"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
