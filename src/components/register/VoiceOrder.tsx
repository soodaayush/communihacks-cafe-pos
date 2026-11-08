"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { canRecord, startRecording, type Recording } from "@/lib/recorder";
import { sizeLabel } from "@/lib/sizes";
import { playSound } from "@/lib/sounds";
import { speak, stopSpeaking, unlockAudio } from "@/lib/speech";
import type { DrinkSize, MenuItem } from "@/lib/types";
import { describeOrder, parseOrder } from "@/lib/voice-order";

export interface VoiceLine {
  item: MenuItem;
  size?: DrinkSize;
  /** How many will be added (never more than what is left). */
  qty: number;
  /** How many were asked for. */
  wanted: number;
}

type Phase = "listening" | "thinking" | "result" | "error";

const MAX_SECONDS = 12;
const EXAMPLE = "two large coffees and a muffin";

const MESSAGES = {
  blocked: "The microphone is blocked. Allow it for this page in the browser, then try again.",
  unavailable: "Voice ordering is not set up on this computer yet.",
  failed: "I could not hear that clearly. Please try again.",
  silent: "I did not hear anything. Tap the microphone and speak close to it.",
} as const;

/**
 * Order with your voice: tap the microphone, say what the customer wants, and it fills the order.
 * The recording is turned into text by ElevenLabs (Scribe), the text into order lines by
 * src/lib/voice-order.ts, and the order is read back in the app's voice. Nothing is added until
 * the cashier taps "Add to order".
 */
export function VoiceOrder({
  menu,
  qtyInTray,
  onConfirm,
}: {
  menu: MenuItem[];
  /** How many of an item are already in the order (so we never add more than what is left). */
  qtyInTray: (menuItemId: string) => number;
  onConfirm: (lines: VoiceLine[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const recording = useRef<Recording | null>(null);
  // Decided after the page loads in the browser: no microphone, no button.
  const supported = useSyncExternalStore(
    () => () => {},
    canRecord,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("listening");
  const [heard, setHeard] = useState("");
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  function fail(message: string) {
    setProblem(message);
    setPhase("error");
    playSound("error");
    speak(message);
  }

  async function begin() {
    setOpen(true);
    setPhase("listening");
    setProblem(null);
    setHeard("");
    setLines([]);
    stopSpeaking();
    unlockAudio(); // the read-back arrives after a moment: allow sound now, while this is a tap
    try {
      recording.current = await startRecording(MAX_SECONDS * 1000, () => void finish());
      playSound("listen");
    } catch {
      fail(MESSAGES.blocked);
    }
  }

  async function finish() {
    const rec = recording.current;
    if (!rec) return;
    recording.current = null;
    setPhase("thinking");
    try {
      const clip = await rec.stop();
      if (clip.size < 1500) return fail(MESSAGES.silent);
      const form = new FormData();
      form.set("audio", clip, "order.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (res.status === 503) return fail(MESSAGES.unavailable);
      if (!res.ok) return fail(MESSAGES.failed);
      const { text } = (await res.json()) as { text: string };
      understand(text);
    } catch {
      fail(MESSAGES.failed);
    }
  }

  function understand(text: string) {
    const parsed = parseOrder(text, menu);
    const used = new Map<string, number>();
    const next: VoiceLine[] = parsed.lines.map((l) => {
      const item = menu.find((m) => m.id === l.menuItemId)!;
      const left = Math.max(0, item.stock - qtyInTray(item.id) - (used.get(item.id) ?? 0));
      const qty = Math.min(l.qty, left);
      used.set(item.id, (used.get(item.id) ?? 0) + qty);
      return { item, size: l.size, qty, wanted: l.qty };
    });
    setHeard(text);
    setLines(next);
    setPhase("result");

    const ok = next.filter((l) => l.qty > 0);
    if (next.length === 0) speak("Sorry, I did not catch an order. Please try again.");
    else if (ok.length === 0) speak("Sorry, those are sold out.");
    else
      speak(
        `I heard ${describeOrder(ok.map((l) => ({ name: l.item.name, size: l.size, qty: l.qty })))}. Is that right?`,
      );
  }

  function close() {
    recording.current?.cancel();
    recording.current = null;
    stopSpeaking();
    setOpen(false);
    dialogRef.current?.close();
  }

  const ready = lines.filter((l) => l.qty > 0);

  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={begin}
        aria-label="Order with your voice"
        title="Order with your voice"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-ink/10 transition-transform motion-safe:active:scale-95"
      >
        <Icon name="mic" className="size-7" />
      </button>

      {open && (
        <dialog
          ref={dialogRef}
          onClose={close}
          aria-labelledby="voice-title"
          className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-tile bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
        >
          <div className="flex flex-col gap-5">
            <h2 id="voice-title" className="flex items-center gap-3 text-2xl font-bold">
              <Icon name="mic" className="size-9" />
              Order with your voice
            </h2>

            {phase === "listening" && (
              <>
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="flex size-28 items-center justify-center rounded-full bg-sage motion-safe:animate-pulse">
                    <Icon name="mic" className="size-16" />
                  </span>
                  <p className="text-2xl font-semibold">I am listening…</p>
                  <p className="text-lg text-ink-soft">
                    Say the order, like &ldquo;{EXAMPLE}&rdquo;. Tap Done when you finish.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className={`${btn} bg-cream ring-1 ring-ink/15`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void finish()}
                    className={`${btn} bg-sage font-bold`}
                  >
                    <Icon name="check" className="size-6" />
                    Done
                  </button>
                </div>
              </>
            )}

            {phase === "thinking" && (
              <p className="py-10 text-center text-2xl font-semibold motion-safe:animate-pulse">
                Working out the order…
              </p>
            )}

            {phase === "result" && (
              <>
                <p className="text-lg text-ink-soft">
                  I heard: <span className="font-semibold text-ink">&ldquo;{heard}&rdquo;</span>
                </p>
                {lines.length === 0 ? (
                  <p className="rounded-tile bg-butter/60 p-4 text-xl">
                    I did not find anything on the menu. Try saying it like &ldquo;{EXAMPLE}&rdquo;.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {lines.map((l) => (
                      <li
                        key={`${l.item.id}|${l.size ?? ""}`}
                        className={`flex items-center gap-3 rounded-tile p-3 ring-1 ${l.qty > 0 ? "bg-cream ring-ink/10" : "bg-blush/50 ring-ink/10"}`}
                      >
                        <Image
                          src={imageUrl(l.item.imagePublicId, 96)}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="size-12"
                        />
                        <span className="flex-1 text-xl font-semibold">
                          {l.item.name}
                          {l.size && (
                            <span className="font-normal text-ink-soft">
                              {" "}
                              · {sizeLabel(l.size)}
                            </span>
                          )}
                          {l.qty < l.wanted && (
                            <span className="block text-base font-normal text-ink-soft">
                              {l.qty === 0 ? "Sold out" : `Only ${l.qty} left`}
                            </span>
                          )}
                        </span>
                        <span className="text-3xl font-bold tabular-nums">× {l.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={begin}
                    className={`${btn} bg-cream ring-1 ring-ink/15`}
                  >
                    <Icon name="mic" className="size-6" />
                    Try again
                  </button>
                  <button
                    type="button"
                    disabled={ready.length === 0}
                    onClick={() => {
                      onConfirm(ready);
                      playSound("success");
                      close();
                    }}
                    className={`${btn} bg-sage font-bold disabled:opacity-50`}
                  >
                    <Icon name="check" className="size-6" />
                    Add to order
                  </button>
                </div>
              </>
            )}

            {phase === "error" && (
              <>
                <p role="alert" className="rounded-tile bg-blush/60 p-4 text-xl">
                  {problem}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className={`${btn} bg-cream ring-1 ring-ink/15`}
                  >
                    Close
                  </button>
                  <button type="button" onClick={begin} className={`${btn} bg-sage font-bold`}>
                    <Icon name="mic" className="size-6" />
                    Try again
                  </button>
                </div>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

const btn = "flex min-h-touch items-center justify-center gap-2 rounded-tile text-xl font-semibold";
