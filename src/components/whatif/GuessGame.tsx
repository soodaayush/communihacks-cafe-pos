"use client";

import Image from "next/image";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import { makeScenario, reasons, type Scenario } from "@/lib/whatif-game";
import { FitToBox } from "./FitToBox";
import { MiniJar, SaleBar } from "./pictures";

// Two ideas this cashier can learn by practising: part of each sale is yours, and a higher
// price means more for you from each one. (Customers leaving is a staff topic: Try a price.)
const QUESTIONS = 2;

/** Same sequence on the server and in the browser, so the first round matches on both. */
function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}
const STARS_KEY = "whatif-stars";

const fadeIn =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out starting:translate-y-2 starting:opacity-0";
const choiceBtn =
  "flex flex-1 flex-col items-center justify-center gap-2 rounded-tile bg-white text-2xl font-bold ring-1 ring-ink/10 motion-safe:transition-[box-shadow,scale,background-color] motion-safe:duration-200 motion-safe:active:scale-[0.97] disabled:cursor-default";

// Stars collected over time. Browser storage can be missing or blocked, so never rely on it.
function readStars(): number {
  try {
    return Number(localStorage.getItem(STARS_KEY)) || 0;
  } catch {
    return 0;
  }
}
const starListeners = new Set<() => void>();
function saveStars(n: number) {
  try {
    localStorage.setItem(STARS_KEY, String(n));
  } catch {
    // fine: stars just won't be remembered
  }
  starListeners.forEach((l) => l());
}
function subscribeStars(listener: () => void) {
  starListeners.add(listener);
  return () => starListeners.delete(listener);
}

interface Question {
  ask: string;
  /** The answer buttons. After answering they turn into the explanation picture. */
  choices: (answered: boolean) => ReactNode;
  correct: string;
  reason: string;
}

/**
 * Learn by guessing: each round is one item at a new price, asked as four small questions.
 * The cashier answers first (by tapping a picture, no numbers needed), then sees why.
 */
export function GuessGame({
  menu,
  soldPerDay,
}: {
  menu: MenuItem[];
  soldPerDay: Record<string, number>;
}) {
  const [scenario, setScenario] = useState<Scenario | null>(() =>
    makeScenario(menu, soldPerDay, seeded(42)),
  );
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const stars = useSyncExternalStore(subscribeStars, readStars, () => 0);

  if (!scenario) {
    return (
      <p className="text-xl text-ink-soft">Sell a few things first, then come back to play.</p>
    );
  }

  const s = scenario;
  const why = reasons(s);
  const name = s.item.name.toLowerCase();
  const answered = picked !== null;
  const done = q >= QUESTIONS;

  function answer(choice: string, correct: string) {
    if (answered) return;
    setPicked(choice);
    if (choice === correct) {
      setRight((r) => r + 1);
      saveStars(readStars() + 1);
    }
  }

  function newRound() {
    setScenario(makeScenario(menu, soldPerDay, Math.random, s.item.id));
    setQ(0);
    setPicked(null);
    setRight(0);
  }

  const itemPic = (
    <Image
      src={imageUrl(s.item.imagePublicId)}
      alt=""
      width={44}
      height={44}
      unoptimized
      className="size-11"
    />
  );
  const scale = Math.max(s.now.priceCents, s.next.priceCents, s.item.costCents);
  const pick = (id: string, correct: string) => (answered ? undefined : () => answer(id, correct));
  const ring = (id: string, correct: string) =>
    !answered
      ? ""
      : id === correct
        ? "ring-4 ring-inset ring-[#6f9f7c]"
        : id === picked
          ? "ring-4 ring-inset ring-blush"
          : "";

  const questions: Question[] = [
    {
      ask: `A customer pays ${formatCents(s.now.priceCents)} for a ${name}. Which part is yours?`,
      correct: "rest",
      reason: why.yours,
      choices: (done) => {
        const costPct = (s.item.costCents / s.now.priceCents) * 100;
        return (
          <div className="flex w-full flex-col gap-4">
            <div className="flex h-24 w-full overflow-hidden rounded-2xl ring-1 ring-ink/10">
              <button
                type="button"
                onClick={pick("cost", "rest")}
                disabled={done}
                aria-label={`The ${name} part`}
                style={{ width: `${Math.max(costPct, 22)}%` }}
                className={`flex items-center justify-center gap-2 text-xl font-bold motion-safe:transition-colors motion-safe:duration-500 ${done ? "bg-blush" : "bg-sky/60"} ${ring("cost", "rest")}`}
              >
                {itemPic}
                {done && <span className="tabular-nums">{formatCents(s.item.costCents)}</span>}
              </button>
              <button
                type="button"
                onClick={pick("rest", "rest")}
                disabled={done}
                aria-label="The rest"
                className={`flex flex-1 items-center justify-center gap-2 border-l-4 border-white text-xl font-bold motion-safe:transition-colors motion-safe:duration-500 ${done ? "bg-sage" : "bg-sky/60"} ${ring("rest", "rest")}`}
              >
                {done && <MiniJar />}
                {done && <span className="tabular-nums">{formatCents(s.now.keepEachCents)}</span>}
              </button>
            </div>
            <p className="text-center text-lg text-ink-soft">
              {done ? "Pink buys it. Green is yours." : "Tap a part"}
            </p>
          </div>
        );
      },
    },
    {
      ask: `Now the ${name} costs ${formatCents(s.next.priceCents)} (not ${formatCents(s.now.priceCents)}). From each one, you keep…`,
      correct: s.up ? "more" : "less",
      reason: why.each,
      choices: (done) =>
        done ? (
          <div className={`flex w-full flex-col gap-3 ${fadeIn}`}>
            {[
              ["Before", s.now],
              ["Now", s.next],
            ].map(([label, r]) => (
              <span key={label as string} className="flex w-full items-center gap-3">
                <span className="w-20 shrink-0 text-left text-xl font-bold">{label as string}</span>
                <SaleBar item={s.item} r={r as typeof s.now} scale={scale} />
              </span>
            ))}
          </div>
        ) : (
          <div className="flex h-40 w-full gap-4">
            <button
              type="button"
              onClick={pick("more", s.up ? "more" : "less")}
              className={choiceBtn}
            >
              <span aria-hidden className="text-5xl">
                ↑
              </span>
              More
            </button>
            <button
              type="button"
              onClick={pick("less", s.up ? "more" : "less")}
              className={choiceBtn}
            >
              <span aria-hidden className="text-5xl">
                ↓
              </span>
              Less
            </button>
          </div>
        ),
    },
  ];

  if (done) {
    return (
      <div className="m-auto flex w-full flex-col items-center gap-5 rounded-tile bg-white p-6 text-center ring-1 ring-ink/10 sm:p-8">
        <div aria-label={`${right} of ${QUESTIONS} right`} className="flex gap-2 text-6xl">
          {Array.from({ length: QUESTIONS }, (_, i) => (
            <span key={i} aria-hidden className={i < right ? "" : "opacity-20 grayscale"}>
              ⭐
            </span>
          ))}
        </div>
        <p className="text-3xl font-bold">
          {right === QUESTIONS ? "All right!" : `${right} of ${QUESTIONS} right`}
        </p>
        <p className="text-xl text-ink-soft">The lesson: {why.each}</p>
        <button
          type="button"
          onClick={newRound}
          autoFocus
          className="flex min-h-touch w-full max-w-md items-center justify-center rounded-tile bg-sage text-2xl font-bold motion-safe:active:scale-[0.98]"
        >
          New round
        </button>
        <p className="text-lg text-ink-soft">⭐ {stars} stars so far</p>
      </div>
    );
  }

  const question = questions[q];
  const correct = picked === question.correct;

  // Fills exactly the space it is given (no page scroll). One card: question on top, the picture
  // in the middle (it flexes and shrinks to fit), and one bottom bar that shows progress before
  // answering and the feedback + Next after. Every slot but the picture has a fixed size.
  return (
    <section
      className="flex h-full min-h-0 flex-col gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10 sm:p-5"
      aria-live="polite"
    >
      <div key={`ask-${q}`} className={`flex h-24 shrink-0 items-center gap-3 sm:gap-4 ${fadeIn}`}>
        <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-cream sm:flex">
          {itemPic}
        </span>
        <p className="flex-1 text-lg leading-snug font-bold sm:text-2xl">{question.ask}</p>
        <SpeakButton text={question.ask} />
      </div>

      <FitToBox key={`stage-${q}`} className={`flex-1 ${fadeIn}`}>
        <div className="flex justify-center px-1 py-2">{question.choices(answered)}</div>
      </FitToBox>

      <div className="flex h-32 shrink-0 items-center gap-3 sm:h-24">
        {answered ? (
          <>
            <div
              key={`fb-${q}`}
              className={`flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 sm:gap-4 sm:px-4 ${correct ? "bg-sage/60" : "bg-butter/70"} ${fadeIn}`}
            >
              <span aria-hidden className="hidden text-3xl sm:inline">
                {correct ? "⭐" : "👀"}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-snug sm:text-lg">
                <strong className="block text-base sm:text-xl">
                  {correct ? "Yes! ⭐" : "Not quite. Look:"}
                </strong>
                {question.reason}
              </p>
              <SpeakButton text={`${correct ? "Yes!" : "Not quite."} ${question.reason}`} />
            </div>
            <button
              type="button"
              onClick={() => {
                setQ(q + 1);
                setPicked(null);
              }}
              autoFocus
              aria-label={q === QUESTIONS - 1 ? "See my stars" : "Next"}
              className={`flex h-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-sage px-4 text-2xl font-bold motion-safe:active:scale-[0.98] sm:px-7 ${fadeIn}`}
            >
              <span className="hidden sm:inline">{q === QUESTIONS - 1 ? "Stars" : "Next"}</span>
              <span aria-hidden className="text-3xl">
                →
              </span>
            </button>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-6">
            <span className="flex gap-2" aria-label={`Question ${q + 1} of ${QUESTIONS}`}>
              {Array.from({ length: QUESTIONS }, (_, i) => (
                <span
                  key={i}
                  className={`size-3 rounded-full ${i <= q ? "bg-ink" : "bg-ink/20"}`}
                />
              ))}
            </span>
            <span className="text-xl font-semibold text-ink-soft">⭐ {stars}</span>
          </div>
        )}
      </div>
    </section>
  );
}
