"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import type { Outcome } from "@/lib/whatif";
import { Jar, MoneyBar, People } from "./pictures";

interface Step {
  /** Steps with the same kind in a row keep their picture on screen, so a bar can morph. */
  kind: "bar" | "bars" | "people" | "jar";
  picture: ReactNode;
  words: string; // a few easy words
  big?: string; // the one number for this step
  math?: string; // only once the pieces have been shown
}

const MAX_PEOPLE = 40;

/** One sale, then one day, told one small step at a time. */
function steps(item: MenuItem, r: Outcome): Step[] {
  const price = formatCents(r.priceCents);
  const cost = formatCents(item.costCents);
  const keep = formatCents(Math.abs(r.keepEachCents));
  const day = formatCents(Math.abs(r.keepPerDayCents));
  const scale = Math.max(r.priceCents, item.costCents);
  const name = item.name.toLowerCase();
  const loses = r.keepEachCents < 0;

  const people = <People count={Math.min(r.soldPerDay, MAX_PEOPLE)} />;

  const pays: Step = {
    kind: "bar",
    picture: (
      <MoneyBar
        scale={scale}
        parts={[{ cents: r.priceCents, className: "bg-sky", label: price }]}
      />
    ),
    words: `A customer buys a ${name}. They pay`,
    big: price,
  };

  if (loses) {
    return [
      pays,
      {
        kind: "bars",
        picture: (
          <span className="flex w-full flex-col gap-3">
            <MoneyBar
              scale={scale}
              parts={[{ cents: r.priceCents, className: "bg-sky", label: price }]}
            />
            <MoneyBar
              scale={scale}
              parts={[{ cents: item.costCents, className: "bg-blush", label: cost }]}
            />
          </span>
        ),
        words: `But making the ${name} costs more`,
        big: cost,
      },
      {
        kind: "bar",
        picture: (
          <MoneyBar
            scale={scale}
            parts={[{ cents: item.costCents - r.priceCents, className: "bg-blush", label: keep }]}
          />
        ),
        words: "You lose on each one",
        big: keep,
        math: `${cost} − ${price} = ${keep}`,
      },
      {
        kind: "people",
        picture: people,
        words: `${r.soldPerDay} people buy one each day`,
        big: `${r.soldPerDay}`,
      },
      {
        kind: "jar",
        picture: <Jar fill={0} size="lg" />,
        words: "So each day you lose",
        big: day,
        math: `${r.soldPerDay} × ${keep} = ${day}`,
      },
    ];
  }

  return [
    pays,
    {
      kind: "bar",
      picture: (
        <MoneyBar
          scale={scale}
          parts={[
            { cents: item.costCents, className: "bg-blush", label: cost },
            { cents: r.keepEachCents, className: "bg-sky/40" },
          ]}
        />
      ),
      words: `Some of it buys what you need to make the ${name}`,
      big: cost,
    },
    {
      kind: "bar",
      picture: (
        <MoneyBar
          scale={scale}
          parts={[
            { cents: item.costCents, className: "bg-blush/40" },
            { cents: r.keepEachCents, className: "bg-sage", label: keep },
          ]}
        />
      ),
      words: "The rest is yours",
      big: keep,
      math: `${price} − ${cost} = ${keep}`,
    },
    {
      kind: "people",
      picture: people,
      words: `${r.soldPerDay} people buy one each day`,
      big: `${r.soldPerDay}`,
    },
    {
      kind: "jar",
      picture: <Jar fill={0.9} layers={Math.min(r.soldPerDay, MAX_PEOPLE)} size="lg" />,
      words: `Each person adds ${keep} to the jar. Each day you keep`,
      big: day,
      math: `${r.soldPerDay} × ${keep} = ${day}`,
    },
  ];
}

const fadeIn =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out starting:translate-y-2 starting:opacity-0";

const navBtn =
  "flex min-h-touch flex-1 items-center justify-center gap-2 rounded-tile text-2xl font-bold transition-transform disabled:opacity-40 motion-safe:active:scale-[0.98]";

export function WhatIfStory({
  item,
  result,
  onClose,
}: {
  item: MenuItem;
  result: Outcome;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState(0);
  useEffect(() => ref.current?.showModal(), []);

  const all = steps(item, result);
  const step = all[at];
  const last = at === all.length - 1;
  const say = [step.words, step.big, step.math].filter(Boolean).join(" ");

  return (
    <dialog
      ref={ref}
      aria-label={`How ${item.name} money works`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-[2rem] bg-cream p-6 text-ink backdrop:bg-ink/40 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out sm:p-8 starting:translate-y-8 starting:opacity-0"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <Image
            src={imageUrl(item.imagePublicId)}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="size-12"
          />
          <span className="text-2xl font-bold tabular-nums">{formatCents(result.priceCents)}</span>
        </span>
        <span className="flex gap-2" aria-label={`Step ${at + 1} of ${all.length}`}>
          {all.map((_, i) => (
            <span
              key={i}
              className={`size-3 rounded-full motion-safe:transition-colors motion-safe:duration-300 ${i <= at ? "bg-ink" : "bg-ink/20"}`}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-14 items-center justify-center rounded-full bg-white text-3xl ring-1 ring-ink/10"
        >
          ×
        </button>
      </div>

      <div
        className="flex flex-col items-center gap-5 rounded-tile bg-white p-6 text-center ring-1 ring-ink/10"
        aria-live="polite"
      >
        <div key={step.kind} className={`flex h-64 w-full items-center justify-center ${fadeIn}`}>
          {step.picture}
        </div>
        <div key={at} className={`flex w-full flex-col items-center gap-3 ${fadeIn}`}>
          <p className="flex h-24 items-center text-2xl font-semibold sm:h-16">{step.words}</p>
          <p className="h-16 text-hero leading-none font-bold tabular-nums">{step.big}</p>
          <p className="h-7 text-xl text-ink-soft tabular-nums">{step.math}</p>
        </div>
        <SpeakButton text={say} />
      </div>

      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={() => setAt(at - 1)}
          disabled={at === 0}
          className={`${navBtn} bg-white ring-1 ring-ink/10`}
        >
          <span aria-hidden>←</span> Back
        </button>
        <button
          type="button"
          onClick={() => (last ? onClose() : setAt(at + 1))}
          autoFocus
          className={`${navBtn} bg-sage`}
        >
          {last ? "Done" : "Next"} {!last && <span aria-hidden>→</span>}
        </button>
      </div>
    </dialog>
  );
}
