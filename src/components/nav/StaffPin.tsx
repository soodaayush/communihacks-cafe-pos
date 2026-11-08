"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { playSound } from "@/lib/sounds";
import { setPinAsker } from "@/lib/staff-client";

const MIN_DIGITS = 4;
const MAX_DIGITS = 8;
const QUESTION = "Staff only. A staff member types the PIN to save this change.";

/**
 * The staff PIN pad. Mounted once in the layout; it opens only when a save is refused for a missing
 * PIN (see staffFetch), so a café with no STAFF_PIN never sees it.
 */
export function StaffPin() {
  const [request, setRequest] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  useEffect(() => {
    setPinAsker(() => new Promise<boolean>((resolve) => setRequest({ resolve })));
    return () => setPinAsker(null);
  }, []);
  if (!request) return null;
  return (
    <PinPad
      onDone={(ok) => {
        request.resolve(ok);
        setRequest(null);
      }}
    />
  );
}

function PinPad({ onDone }: { onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const finished = useRef(false);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const end = (ok: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(ok);
  };
  const type = (digit: string) => {
    setMessage(null);
    setPin((p) => (p.length < MAX_DIGITS ? p + digit : p));
  };
  const back = () => setPin((p) => p.slice(0, -1));

  async function unlock() {
    if (pin.length < MIN_DIGITS || checking) return;
    setChecking(true);
    let problem = "Could not check the PIN. Try again.";
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        playSound("success");
        end(true);
        return;
      }
      problem =
        ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? problem;
    } catch {
      // offline: keep the default message
    }
    playSound("error");
    setMessage(problem);
    setPin("");
    setChecking(false);
  }

  const key =
    "flex min-h-touch items-center justify-center rounded-tile bg-cream text-3xl font-bold tabular-nums ring-1 ring-ink/15 disabled:opacity-40 motion-safe:active:scale-95";

  return (
    <dialog
      ref={ref}
      onClose={() => end(false)}
      onKeyDown={(e) => {
        // A keyboard works too: digits, Backspace, Enter.
        if (/^\d$/.test(e.key)) type(e.key);
        else if (e.key === "Backspace") back();
        else if (e.key === "Enter") void unlock();
        else return;
        e.preventDefault();
      }}
      aria-labelledby="pin-title"
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-tile bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icon name="lock" className="size-12" />
            <div>
              <h2 id="pin-title" className="text-2xl font-bold">
                Staff only
              </h2>
              <p className="text-lg text-ink-soft">Type the staff PIN to save this.</p>
            </div>
          </div>
          <SpeakButton text={QUESTION} size="md" label="Read what to do" />
        </div>

        <p
          aria-live="polite"
          aria-label={`${pin.length} digits typed`}
          className="flex h-8 items-center justify-center gap-3"
        >
          {Array.from({ length: Math.max(MIN_DIGITS, pin.length) }, (_, i) => (
            <span
              key={i}
              className={`size-5 rounded-full ring-2 ring-ink/30 ${i < pin.length ? "bg-ink" : "bg-white"}`}
            />
          ))}
        </p>
        {message && (
          <p role="alert" className="rounded-tile bg-blush p-3 text-center text-lg">
            {message}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              data-sound="tap"
              disabled={checking}
              onClick={() => type(d)}
              className={key}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            aria-label="Delete the last digit"
            disabled={checking || !pin}
            onClick={back}
            className={key}
          >
            <Icon name="backspace" className="size-9" />
          </button>
          <button
            type="button"
            data-sound="tap"
            disabled={checking}
            onClick={() => type("0")}
            className={key}
          >
            0
          </button>
          <button
            type="button"
            aria-label="Unlock"
            disabled={checking || pin.length < MIN_DIGITS}
            onClick={unlock}
            className={`${key} bg-sage`}
          >
            <Icon name="check" className="size-9" />
          </button>
        </div>

        <button
          type="button"
          disabled={checking}
          onClick={() => ref.current?.close()}
          className="min-h-touch rounded-tile bg-cream text-xl font-semibold ring-1 ring-ink/15"
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
}
