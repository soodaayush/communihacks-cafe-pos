"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { MAX_HINTS, type LearnQuestion, type LearnTransaction } from "@/lib/learn";
import { formatCents } from "@/lib/money";
import { FitToBox } from "./FitToBox";
import { HintBulb } from "./parts";
import { useQuestionHelp } from "./useQuestionHelp";

const fadeIn =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out starting:translate-y-2 starting:opacity-0";

/**
 * The look both games share. It fills its parent and never makes the page scroll: the picture area
 * in the middle shrinks to fit, every other part has a fixed size, so nothing moves between states.
 *   header      the question and a read-aloud button
 *   stage       pictures (shrinks to fit)
 *   choices     three big answers (optional)
 *   bar         one fixed-size bar for progress / hints / the answer
 */
export function GameShell({
  headline,
  speakText,
  stage,
  choices,
  bar,
}: {
  headline: string;
  speakText: string;
  stage: ReactNode;
  choices?: ReactNode;
  bar: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-3 rounded-tile bg-white p-4 ring-1 ring-ink/10 sm:p-5">
      <div className="flex h-16 shrink-0 items-center gap-3 sm:h-20 sm:gap-4 [@media(max-height:820px)]:h-12">
        <h2 className="flex-1 text-2xl font-bold sm:text-3xl [@media(max-height:820px)]:text-xl">
          {headline}
        </h2>
        <SpeakButton
          text={speakText}
          label="Read the question"
          className="[@media(max-height:820px)]:size-12"
        />
      </div>
      <FitToBox className="flex-1">
        <div className="flex justify-center px-1 py-2">{stage}</div>
      </FitToBox>
      {choices}
      <div
        role="status"
        aria-live="polite"
        className="flex h-32 shrink-0 items-center gap-3 sm:h-28 [@media(max-height:820px)]:h-24"
      >
        {bar}
      </div>
    </section>
  );
}

export function NextButton({
  onClick,
  done = false,
  className = "",
}: {
  onClick: () => void;
  done?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      aria-label={done ? "Done" : "Next"}
      className={`flex h-full w-20 shrink-0 items-center justify-center rounded-2xl bg-sage text-4xl font-bold motion-safe:active:scale-[0.98] sm:w-28 ${fadeIn} ${className}`}
    >
      {done ? <Icon name="check" className="size-12" /> : <span aria-hidden>→</span>}
    </button>
  );
}

export interface QuestionFrameProps {
  tx: LearnTransaction;
  q: LearnQuestion;
  headline: string;
  speakText: string;
  /** The pictures. `solved` is true after the right answer. */
  stage: (solved: boolean) => ReactNode;
  /** The last question of a game shows a check instead of an arrow. */
  nextIsDone?: boolean;
  onSolved?: (clean: boolean) => void;
  onNext: () => void;
}

/** One question, Khan Academy style: try, get a hint if it is not right yet, then see why. */
export function QuestionFrame({
  tx,
  q,
  headline,
  speakText,
  stage,
  nextIsDone = false,
  onSolved,
  onNext,
}: QuestionFrameProps) {
  const help = useQuestionHelp(tx, q, onSolved);
  const { tried, solved, revealed } = help;
  const hint = revealed.length > 0 ? revealed[revealed.length - 1] : null;

  const choices = (
    <div role="group" aria-label="Answers" className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
      {q.choices.map((c) => {
        const wrong = tried.includes(c);
        const right = solved && c === q.correctCents;
        return (
          <button
            key={c}
            type="button"
            onClick={() => help.choose(c)}
            disabled={solved || wrong}
            aria-label={wrong ? `${formatCents(c)}, not it` : formatCents(c)}
            className={`flex h-20 min-w-0 flex-col items-center justify-center gap-0.5 rounded-tile text-2xl font-bold tabular-nums ring-1 disabled:cursor-default motion-safe:transition-[background-color,box-shadow,opacity] motion-safe:duration-200 motion-safe:active:scale-[0.97] sm:h-24 sm:text-3xl [@media(max-height:820px)]:h-16 ${
              right
                ? "bg-sage ring-4 ring-[#6f9f7c]"
                : wrong
                  ? "bg-ink/5 text-ink/30 ring-ink/10"
                  : solved
                    ? "bg-white opacity-50 ring-ink/10"
                    : "bg-white ring-ink/15"
            }`}
          >
            {wrong && <Icon name="cross" className="size-6" />}
            {right && <Icon name="check" className="size-7" />}
            {formatCents(c)}
          </button>
        );
      })}
    </div>
  );

  const bar = solved ? (
    <>
      <div
        className={`flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl bg-sage/60 px-3 sm:px-4 ${fadeIn}`}
      >
        <Icon
          name={help.clean ? "star" : "check"}
          className={
            help.clean
              ? "size-10 sm:size-12"
              : "size-10 sm:size-12 [@media(max-height:820px)]:hidden"
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold [@media(max-height:820px)]:text-xl">Yes!</p>
          <p className="line-clamp-3 text-sm leading-snug sm:text-base [@media(max-height:820px)]:line-clamp-4 [@media(max-height:820px)]:text-[13px] [@media(max-height:820px)]:leading-tight">
            {help.explanation ?? ""}
          </p>
        </div>
        {help.explanation && (
          <SpeakButton text={help.explanation} size="sm" label="Read the explanation" />
        )}
      </div>
      <NextButton onClick={onNext} done={nextIsDone} />
    </>
  ) : tried.length > 0 ? (
    <>
      <div
        key={`hint-${revealed.length}`}
        className={`flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl bg-butter/60 px-3 sm:px-4 ${fadeIn}`}
      >
        <p className="min-w-0 flex-1 text-lg leading-snug font-semibold sm:text-2xl">
          {hint ?? "Not yet. Try again."}
        </p>
        <SpeakButton text={hint ?? "Not yet. Try again."} size="sm" label="Read the hint" />
      </div>
      <button
        type="button"
        onClick={help.showHint}
        disabled={!help.canHint}
        aria-label={`Hint ${Math.min(revealed.length + 1, MAX_HINTS)} of ${MAX_HINTS}`}
        className="flex h-full w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-white ring-2 ring-butter disabled:opacity-40 motion-safe:active:scale-[0.97] sm:w-24"
      >
        <HintBulb className="size-10 sm:size-12" />
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: MAX_HINTS }, (_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full ${i < revealed.length ? "bg-ink" : "bg-ink/20"}`}
            />
          ))}
        </span>
      </button>
    </>
  ) : (
    <div className="flex flex-1 items-center justify-center gap-4">
      {q.steps > 1 ? (
        <span className="flex gap-2" aria-label={`Question ${q.step + 1} of ${q.steps}`}>
          {Array.from({ length: q.steps }, (_, i) => (
            <span
              key={i}
              className={`size-3.5 rounded-full ${i <= q.step ? "bg-ink" : "bg-ink/20"}`}
            />
          ))}
        </span>
      ) : (
        <p className="text-xl text-ink-soft">Tap the right amount</p>
      )}
    </div>
  );

  return (
    <GameShell
      headline={headline}
      speakText={speakText}
      stage={stage(solved)}
      choices={choices}
      bar={bar}
    />
  );
}
