"use client";

import { useEffect, useRef, useState } from "react";
import { DENOMS, breakdown, roundCash, type Denom } from "@/lib/cash";
import { formatCents } from "@/lib/money";
import type { PaymentMethod, SaleItem } from "@/lib/types";
import { MoneyPiece, denomLabel } from "./Cash";

export interface PaymentChoiceProps {
  items: SaleItem[];
  totalCents: number;
  /** Saves the sale. Throws on failure so the cashier can try again. */
  onPaid: (method: PaymentMethod) => Promise<void>;
  /** paid = true once the sale is saved: start a new order. */
  onClose: (paid: boolean) => void;
}

type Step = "choose" | "cash" | "card" | "done";
type CardStatus = "waiting" | "checking" | "approved";

// The customer's tap is simulated so the demo runs by itself: wait, then the bank checks, then approved.
const CARD_TIMING: Record<CardStatus, number> = { waiting: 3000, checking: 2000, approved: 1200 };

const CARD_STEPS: { status: CardStatus; label: string; lesson: string }[] = [
  { status: "waiting", label: "Tap", lesson: "The customer taps their own card." },
  { status: "checking", label: "Bank checks", lesson: "Their bank checks they have enough money." },
  {
    status: "approved",
    label: "Approved",
    lesson: "The money moves from their bank to the café's bank.",
  },
];

const bigBtn =
  "flex min-h-touch items-center justify-center gap-3 rounded-tile px-6 text-2xl font-bold transition-transform motion-safe:active:scale-[0.98] disabled:opacity-50";

function CardPicture({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 80" className={className}>
      <rect
        x="2"
        y="2"
        width="116"
        height="76"
        rx="10"
        fill="#d4cbe8"
        stroke="#4a4a55"
        strokeWidth="3"
      />
      <rect x="2" y="16" width="116" height="12" fill="#4a4a55" opacity=".7" />
      <rect
        x="14"
        y="40"
        width="22"
        height="16"
        rx="3"
        fill="#f3e3ad"
        stroke="#4a4a55"
        strokeWidth="2"
      />
      <path d="M14 66h40" stroke="#4a4a55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function TapWaves({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M8 8.5a5 5 0 0 1 0 7M11.5 6a9 9 0 0 1 0 12M15 3.5a13 13 0 0 1 0 17" />
    </svg>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

/** The card machine the customer sees, facing them across the counter. */
function CardMachine({ totalCents, status }: { totalCents: number; status: CardStatus }) {
  return (
    <div className="w-60 rounded-[2rem] bg-ink p-4 pb-6 shadow-[0_8px_24px_rgb(74_74_85/0.25)]">
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-cream text-ink">
        <span className="text-3xl font-bold tabular-nums">{formatCents(totalCents)}</span>
        {status === "waiting" && (
          <>
            <TapWaves className="size-10 motion-safe:animate-pulse" />
            <span className="text-lg font-semibold">Tap card</span>
          </>
        )}
        {status === "checking" && (
          <>
            <span className="flex gap-2 py-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-3 rounded-full bg-ink/60 motion-safe:animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <span className="text-lg font-semibold">Checking…</span>
          </>
        )}
        {status === "approved" && (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-sage">
              <Check className="size-6" />
            </span>
            <span className="text-lg font-semibold">Approved</span>
          </>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 px-4" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="h-3 rounded-full bg-white/25" />
        ))}
      </div>
    </div>
  );
}

export function PaymentChoice({ items, totalCents, onPaid, onClose }: PaymentChoiceProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const [given, setGiven] = useState<Denom[]>([]);
  const [cardStatus, setCardStatus] = useState<CardStatus>("waiting");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => ref.current?.showModal(), []);

  const due = roundCash(totalCents);
  const got = given.reduce((sum, d) => sum + d, 0);
  const change = got - due;

  // The total written as a sum. Small amounts repeat (2 coffees = $2.00 + $2.00) so nobody has to multiply.
  const terms = items.flatMap((l) =>
    l.qty <= 4
      ? Array.from({ length: l.qty }, () => formatCents(l.unitPriceCents))
      : [`${l.qty} × ${formatCents(l.unitPriceCents)}`],
  );

  async function finish(m: PaymentMethod) {
    setMethod(m);
    setSaving(true);
    setFailed(false);
    try {
      await onPaid(m);
      setStep("done");
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  // Walk the card machine through its states; leaving the card step cancels the timer.
  useEffect(() => {
    if (step !== "card") return;
    const t = setTimeout(() => {
      if (cardStatus === "waiting") setCardStatus("checking");
      else if (cardStatus === "checking") setCardStatus("approved");
      else void finish("debit");
    }, CARD_TIMING[cardStatus]);
    return () => clearTimeout(t);
    // finish is recreated every render; the timer only depends on where the machine is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cardStatus]);

  const cardIndex = CARD_STEPS.findIndex((s) => s.status === cardStatus);

  return (
    <dialog
      ref={ref}
      aria-label="Pay"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose(step === "done");
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] overflow-y-auto rounded-[2rem] bg-cream p-6 text-ink backdrop:bg-ink/40 sm:p-8"
    >
      {step !== "done" && (
        <div className="mb-6 flex items-center justify-between gap-4">
          {step === "choose" || cardStatus === "approved" ? (
            <span className="w-14" />
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep("choose");
                setGiven([]);
                setCardStatus("waiting");
                setFailed(false);
              }}
              className="flex min-h-14 items-center gap-2 rounded-full bg-white px-5 text-xl font-semibold ring-1 ring-ink/10"
            >
              <span aria-hidden>←</span> Back
            </button>
          )}
          <div className="text-center">
            <p className="text-2xl font-semibold">
              Total{" "}
              <span className="ml-2 text-number font-bold tabular-nums">
                {formatCents(step === "cash" ? due : totalCents)}
              </span>
            </p>
            {terms.length > 1 && (
              <p className="text-base text-ink-soft tabular-nums">
                {terms.join(" + ")} = {formatCents(totalCents)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            disabled={saving || (step === "card" && cardStatus === "approved" && !failed)}
            aria-label="Close"
            className="flex size-14 items-center justify-center rounded-full bg-white text-3xl ring-1 ring-ink/10 disabled:opacity-40"
          >
            ×
          </button>
        </div>
      )}

      {step === "choose" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep("cash")}
            className="flex flex-col items-center gap-5 rounded-tile bg-white py-10 ring-1 ring-ink/10 transition-transform motion-safe:active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <MoneyPiece cents={2000} />
              <MoneyPiece cents={100} />
            </span>
            <span className="text-3xl font-bold">Cash</span>
          </button>
          <button
            type="button"
            onClick={() => setStep("card")}
            className="flex flex-col items-center gap-5 rounded-tile bg-white py-10 ring-1 ring-ink/10 transition-transform motion-safe:active:scale-[0.98]"
          >
            <CardPicture className="h-16" />
            <span className="text-3xl font-bold">Card</span>
          </button>
        </div>
      )}

      {step === "cash" && (
        <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
          <section aria-label="Money they gave you">
            <p className="mb-4 text-xl text-ink-soft">Tap what they give you</p>
            <div className="flex flex-wrap gap-3">
              {DENOMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setGiven((g) => [...g, d])}
                  aria-label={`Add ${denomLabel(d)}`}
                  className="flex min-h-touch min-w-touch items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-ink/10 transition-transform motion-safe:active:scale-95"
                >
                  <MoneyPiece cents={d} />
                </button>
              ))}
            </div>
            {given.length > 0 && (
              <button
                type="button"
                onClick={() => setGiven([])}
                className="mt-5 min-h-14 rounded-full bg-white px-5 text-xl font-semibold ring-1 ring-ink/10"
              >
                Start over
              </button>
            )}
          </section>

          <section
            className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10"
            aria-live="polite"
          >
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-semibold">Got</span>
                <span className="text-number font-bold tabular-nums">{formatCents(got)}</span>
              </div>
              {given.length > 1 && (
                <p className="text-right text-base text-ink-soft tabular-nums">
                  {given.map(denomLabel).join(" + ")}
                </p>
              )}
            </div>
            {got > 0 && change < 0 && (
              <p className="rounded-2xl bg-butter/60 p-4 text-xl">
                Need <strong className="tabular-nums">{formatCents(-change)}</strong> more
              </p>
            )}
            {got > 0 && change >= 0 && (
              <div className="rounded-2xl bg-sage/50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-semibold">Give back</span>
                  <span className="text-number font-bold tabular-nums">{formatCents(change)}</span>
                </div>
                {/* Brief math: what they gave, take away the total. */}
                <p className="mt-1 text-right text-base tabular-nums">
                  {formatCents(got)} − {formatCents(due)} = {formatCents(change)}
                </p>
                <div
                  className="mt-3 flex flex-wrap items-center gap-2"
                  aria-label={breakdown(change).map(denomLabel).join(", ") || "No change"}
                >
                  {change === 0 ? (
                    <span className="text-xl">No change</span>
                  ) : (
                    breakdown(change).map((d, i) => <MoneyPiece key={i} cents={d} />)
                  )}
                </div>
              </div>
            )}
            {failed && (
              <p className="rounded-2xl bg-blush/70 p-4 text-xl">Not saved. Tap Done again.</p>
            )}
            <button
              type="button"
              disabled={change < 0 || saving}
              onClick={() => finish("cash")}
              className={`${bigBtn} mt-auto bg-sage`}
            >
              Done
            </button>
          </section>
        </div>
      )}

      {step === "card" && (
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <CardMachine totalCents={totalCents} status={cardStatus} />
          </div>

          <div className="flex flex-col gap-5">
            <p className="text-2xl font-semibold">Turn the machine to the customer</p>
            <ol className="flex flex-col gap-3" aria-live="polite">
              {CARD_STEPS.map((s, i) => {
                const done = i < cardIndex || cardStatus === "approved";
                const now = i === cardIndex && cardStatus !== "approved";
                return (
                  <li
                    key={s.status}
                    aria-current={now ? "step" : undefined}
                    className={`flex items-start gap-4 rounded-2xl p-4 ${now ? "bg-white ring-1 ring-ink/15" : done ? "" : "opacity-45"}`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${done ? "bg-sage" : "bg-white ring-1 ring-ink/15"}`}
                    >
                      {done ? <Check className="size-5" /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-xl font-bold">{s.label}</span>
                      <span className="block text-lg">{s.lesson}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {failed && (
              <button
                type="button"
                disabled={saving}
                onClick={() => finish("debit")}
                className={`${bigBtn} bg-blush/70`}
              >
                Not saved. Try again
              </button>
            )}
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-sage">
            <Check className="size-10" />
          </span>
          <h2 className="text-3xl font-bold">Sale done</h2>

          {/* The teaching moment: where this sale's money goes. */}
          <div className="w-full max-w-xl rounded-tile bg-white p-6 text-left ring-1 ring-ink/10">
            <p className="mb-4 flex items-center gap-3 text-xl">
              {method === "cash" ? (
                <>
                  <MoneyPiece cents={500} /> The money is in the cash drawer.
                </>
              ) : (
                <>
                  <CardPicture className="h-10 shrink-0" /> The money is in the café&apos;s bank.
                </>
              )}
            </p>
            <p className="flex items-baseline justify-between text-xl">
              They paid
              <span className="text-2xl font-bold tabular-nums">{formatCents(totalCents)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => onClose(true)}
            autoFocus
            className={`${bigBtn} w-full max-w-xl bg-sage`}
          >
            New order
          </button>
        </div>
      )}
    </dialog>
  );
}
