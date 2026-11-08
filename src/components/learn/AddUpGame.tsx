"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  addQuestions,
  chainLabels,
  pieces,
  type LearnQuestion,
  type LearnTransaction,
} from "@/lib/learn";
import { markDone } from "@/lib/learn-progress";
import { formatCents } from "@/lib/money";
import { GameShell, NextButton, QuestionFrame } from "./QuestionFrame";
import { AmountTile, PieceImage } from "./parts";

export interface GameProps {
  tx: LearnTransaction;
  /** Called once when the whole game is finished (the game itself calls markDone first). */
  onDone: () => void;
}

const BIG = "size-14 sm:size-20 [@media(max-height:760px)]:size-12";
const MAX_GROUPS = 6;

/** "2 muffins and a coffee": add the prices and watch them make the total. */
export function AddUpGame(props: GameProps) {
  // A different transaction is a fresh game.
  return <AddUp key={props.tx.id} {...props} />;
}

function AddUp({ tx, onDone }: GameProps) {
  const questions = useMemo(() => addQuestions(tx), [tx]);
  const [step, setStep] = useState(0);
  const [allClean, setAllClean] = useState(true);
  const [finished, setFinished] = useState(false);
  const closed = useRef(false);

  if (questions.length === 0) {
    return (
      <GameShell
        headline="Add it up"
        speakText="Nothing to add here."
        stage={
          <div className="flex flex-col items-center gap-3 py-6 text-ink-soft">
            <Icon name="receipt" className="size-16" />
          </div>
        }
        bar={<div className="flex-1" />}
      />
    );
  }

  if (finished)
    return (
      <Finished
        tx={tx}
        allClean={allClean}
        onClose={() => {
          if (closed.current) return;
          closed.current = true;
          markDone(tx.id, "add", allClean);
          onDone();
        }}
      />
    );

  const q = questions[step];
  return (
    <QuestionFrame
      key={q.step}
      tx={tx}
      q={q}
      headline={
        q.op === "times" ? "How much for all?" : q.op === "single" ? "The total" : "Add them up"
      }
      speakText={
        q.op === "plus"
          ? `How much is ${formatCents(q.leftCents)} + ${formatCents(q.rightCents)}?`
          : q.ask
      }
      stage={(solved) => <AddUpStage q={q} solved={solved} />}
      nextIsDone={false}
      onSolved={(clean) => {
        if (!clean) setAllClean(false);
      }}
      onNext={() => (step + 1 < questions.length ? setStep(step + 1) : setFinished(true))}
    />
  );
}

/** The sum, written once with counts ("Muffin × 10 + Large coffee"), with one picture per kind. */
function Finished({
  tx,
  allClean,
  onClose,
}: {
  tx: LearnTransaction;
  allClean: boolean;
  onClose: () => void;
}) {
  const total = formatCents(tx.totalCents);
  const labels = chainLabels(tx);
  const sum = labels.join(" + ");

  // Same grouping as chainLabels: neighbours that are the same thing become one picture + a count.
  const groups: { id: string; n: number }[] = [];
  let lastKey = "";
  for (const p of pieces(tx)) {
    const key = `${p.label}:${p.cents}`;
    const g = groups[groups.length - 1];
    if (g && key === lastKey) g.n++;
    else groups.push({ id: p.imagePublicId, n: 1 });
    lastKey = key;
  }
  const shown = groups.slice(0, MAX_GROUPS);
  const more = groups.length - shown.length;

  return (
    <GameShell
      headline="All added up"
      speakText={`${sum.replaceAll("×", "times").replaceAll("+", "plus")} equals ${total}`}
      stage={
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {shown.map((g, k) => (
              <span key={k} className="relative flex rounded-2xl bg-sage/50 p-1.5 sm:p-2">
                <PieceImage id={g.id} className={BIG} />
                {g.n > 1 && (
                  <span className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white tabular-nums">
                    {g.n}
                  </span>
                )}
              </span>
            ))}
            {more > 0 && <span className="text-xl font-bold text-ink-soft">+{more}</span>}
          </div>
          <p className="line-clamp-2 max-w-full text-center text-lg font-semibold text-ink-soft sm:text-xl">
            {sum}
          </p>
          <p className="text-5xl font-bold tabular-nums sm:text-6xl">= {total}</p>
        </div>
      }
      bar={
        <>
          <div className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl bg-sage/60 px-4">
            <Icon name={allClean ? "star" : "check"} className="size-10 sm:size-12" />
            <p className="text-xl font-bold sm:text-2xl">
              {allClean ? "No help needed!" : "Well done!"}
            </p>
          </div>
          <NextButton done onClick={onClose} />
        </>
      }
    />
  );
}

/** What is on screen while one question is worked out. */
function AddUpStage({ q, solved }: { q: LearnQuestion; solved: boolean }) {
  if (q.op === "times") return <TimesStage q={q} solved={solved} />;
  if (q.op === "single") return <SingleStage q={q} solved={solved} />;
  return <PlusStage q={q} solved={solved} />;
}

const SIGN = "flex items-center text-3xl font-bold sm:text-4xl";

function PlusStage({ q, solved }: { q: LearnQuestion; solved: boolean }) {
  return (
    <div className="flex w-full items-stretch gap-1 sm:gap-2">
      <AmountTile label={q.leftLabel} amount={formatCents(q.leftCents)} tone="bg-sky/40">
        <span className="flex -space-x-2">
          {q.leftImages.slice(-3).map((id, k) => (
            <PieceImage key={k} id={id} className={BIG} />
          ))}
        </span>
      </AmountTile>
      <span aria-hidden className={SIGN}>
        +
      </span>
      <AmountTile
        label={q.rightLabel}
        amount={formatCents(q.rightCents)}
        tone="bg-cream ring-4 ring-ink"
      >
        {q.rightImages[0] && <PieceImage id={q.rightImages[0]} className={BIG} />}
      </AmountTile>
      <span aria-hidden className={SIGN}>
        =
      </span>
      <AnswerTile q={q} solved={solved} label="Together" />
    </div>
  );
}

function SingleStage({ q, solved }: { q: LearnQuestion; solved: boolean }) {
  return (
    <div className="flex w-full items-stretch gap-1 sm:gap-2">
      <AmountTile label={q.leftLabel} amount={formatCents(q.leftCents)} tone="bg-sky/40">
        {q.leftImages[0] && <PieceImage id={q.leftImages[0]} className={BIG} />}
      </AmountTile>
      <span aria-hidden className={SIGN}>
        =
      </span>
      <AnswerTile q={q} solved={solved} label="Total" />
    </div>
  );
}

/** "$2.50 each" × "10 muffins" = the total. One picture and a count, the same size as the addition tiles. */
function TimesStage({ q, solved }: { q: LearnQuestion; solved: boolean }) {
  const count = q.count ?? 0;
  const unit = q.unitCents ?? q.leftCents;
  const id = q.leftImages[0];

  return (
    <div className="flex w-full items-stretch gap-1 sm:gap-2">
      <AmountTile label="Each" amount={formatCents(unit)} tone="bg-sky/40">
        {id && <PieceImage id={id} className={BIG} />}
      </AmountTile>
      <span aria-hidden className={SIGN}>
        ×
      </span>
      <AmountTile label="How many" amount={String(count)} tone="bg-cream ring-4 ring-ink">
        {id && <PieceImage id={id} className={BIG} />}
      </AmountTile>
      <span aria-hidden className={SIGN}>
        =
      </span>
      <AnswerTile q={q} solved={solved} label="Together" />
    </div>
  );
}

/** The answer: a dashed "?" until it is right, then the amount on green. Same size both times. */
function AnswerTile({ q, solved, label }: { q: LearnQuestion; solved: boolean; label: string }) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl p-2 motion-safe:transition-colors motion-safe:duration-300 sm:p-3 ${
        solved
          ? "border-2 border-transparent bg-sage"
          : "border-2 border-dashed border-ink/30 bg-white"
      }`}
    >
      <p className="max-w-full truncate text-sm text-ink-soft sm:text-base">
        {solved ? label : `${label}?`}
      </p>
      <p className="text-2xl font-bold tabular-nums sm:text-4xl">
        {solved ? formatCents(q.correctCents) : "?"}
      </p>
    </div>
  );
}
