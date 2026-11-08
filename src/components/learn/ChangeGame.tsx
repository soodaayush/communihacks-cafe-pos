"use client";

import { useMemo, useRef } from "react";
import { MoneyPiece } from "@/components/register/Cash";
import { Icon } from "@/components/icons/Icon";
import { breakdown } from "@/lib/cash";
import { changeQuestion, type LearnQuestion } from "@/lib/learn";
import { markDone } from "@/lib/learn-progress";
import { formatCents } from "@/lib/money";
import type { GameProps } from "./AddUpGame";
import { GameShell, QuestionFrame } from "./QuestionFrame";
import { AmountTile, PieceImage } from "./parts";

/** "They gave $10 for a $6.75 order": work out the change. Cash sales only. */
export function ChangeGame(props: GameProps) {
  // A different transaction is a fresh game.
  return <Change key={props.tx.id} {...props} />;
}

function Change({ tx, onDone }: GameProps) {
  const q = useMemo(() => changeQuestion(tx), [tx]);
  const clean = useRef(true);
  const closed = useRef(false);

  if (!q) {
    return (
      <GameShell
        headline="Make change"
        speakText="No change to make here."
        stage={
          <div className="flex flex-col items-center gap-3 py-6 text-ink-soft">
            <Icon name="coin" className="size-16" />
          </div>
        }
        bar={<div className="flex-1" />}
      />
    );
  }

  return (
    <QuestionFrame
      tx={tx}
      q={q}
      headline="How much change?"
      speakText={`${q.pretend ? "Pretend they paid cash. " : ""}They gave ${formatCents(q.leftCents)}. It costs ${formatCents(q.rightCents)}. How much change?`}
      stage={(solved) => <ChangeStage q={q} solved={solved} />}
      nextIsDone
      onSolved={(isClean) => {
        clean.current = isClean;
      }}
      onNext={() => {
        if (closed.current) return;
        closed.current = true;
        markDone(tx.id, "change", clean.current);
        onDone();
      }}
    />
  );
}

/** What the customer gave, what it costs, and the change to work out (then shown as real money). */
function ChangeStage({ q, solved }: { q: LearnQuestion; solved: boolean }) {
  const shown = q.rightImages.slice(0, 3);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:gap-2">
        {/* On phones the two top tiles share a row and the change sits below; from sm up it is one row. */}
        <div className="flex w-full items-stretch gap-2 sm:contents">
          <AmountTile
            label={q.pretend ? "Pretend they gave" : "They gave"}
            amount={formatCents(q.leftCents)}
            tone="bg-white ring-1 ring-ink/15"
          >
            <span className="flex min-h-14 flex-wrap items-center justify-center gap-1 sm:min-h-20">
              {breakdown(q.leftCents).map((d, i) => (
                <MoneyPiece key={i} cents={d} />
              ))}
            </span>
          </AmountTile>
          <span aria-hidden className="hidden items-center text-4xl font-bold sm:flex">
            −
          </span>
          <AmountTile label="It costs" amount={formatCents(q.rightCents)} tone="bg-cream">
            <span className="flex items-center justify-center gap-1">
              {shown.map((id, k) => (
                <PieceImage key={k} id={id} />
              ))}
            </span>
          </AmountTile>
        </div>
        <span aria-hidden className="hidden items-center text-4xl font-bold sm:flex">
          =
        </span>

        {/* The change: the same tile as the others. Real bills and coins fade in when it is right. */}
        <div
          className={`relative flex min-h-44 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl p-2 motion-safe:transition-colors motion-safe:duration-300 sm:min-h-0 sm:flex-1 sm:p-3 ${
            solved
              ? "border-2 border-transparent bg-sage"
              : "border-2 border-dashed border-ink/30 bg-white"
          }`}
        >
          <p className="text-sm text-ink-soft sm:text-base">{solved ? "Change" : "Change?"}</p>
          <p className="text-2xl font-bold tabular-nums sm:text-4xl">
            {solved ? formatCents(q.correctCents) : "?"}
          </p>
          {/* Laid over the bottom edge, so the words above never move. */}
          <span
            aria-hidden={!solved}
            className={`pointer-events-none absolute inset-x-1 bottom-2 flex [zoom:0.8] items-center justify-center gap-1 motion-safe:transition-opacity motion-safe:duration-300 ${solved ? "opacity-100" : "opacity-0"}`}
          >
            {breakdown(q.correctCents).map((d, i) => (
              <MoneyPiece key={i} cents={d} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
