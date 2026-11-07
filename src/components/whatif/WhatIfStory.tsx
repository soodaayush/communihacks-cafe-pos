"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import type { Outcome } from "@/lib/whatif";
import { compare as compareOutcomes } from "@/lib/whatif";
import { Jar, MiniJar, MoneyBar, People, PeopleChange, Person, SaleBar } from "./pictures";

interface Step {
  /** Steps with the same kind in a row keep their picture on screen, so the bar can change in place. */
  kind: "bar" | "bars" | "jar" | "day" | "each" | "people" | "jars";
  picture: ReactNode;
  words: string; // about five easy words
  big: string; // the one number for this step ("before → after" when comparing)
}

// Enough faces to see "a lot of people" without counting fatigue; the exact number is in the words.
const MAX_FACES = 20;

/**
 * Basics (price not changed): one sale, then one day, for someone new to money. Four steps, one picture, a few words and
 * one number each. No sums: the pictures carry the maths (the bar splits, the jar fills).
 */
function basicSteps(item: MenuItem, r: Outcome): Step[] {
  const price = formatCents(r.priceCents);
  const cost = formatCents(item.costCents);
  const keep = formatCents(Math.abs(r.keepEachCents));
  const day = formatCents(Math.abs(r.keepPerDayCents));
  const scale = Math.max(r.priceCents, item.costCents);
  const name = item.name.toLowerCase();
  const faces = Math.min(r.soldPerDay, MAX_FACES);
  const itemPic = (
    <Image
      src={imageUrl(item.imagePublicId)}
      alt=""
      width={40}
      height={40}
      unoptimized
      className="size-10"
    />
  );
  const customer = <Person className="size-9" />;

  const pays: Step = {
    kind: "bar",
    picture: (
      <MoneyBar
        scale={scale}
        parts={[{ cents: r.priceCents, className: "bg-sky", label: price, icon: customer }]}
      />
    ),
    words: "A customer pays you",
    big: price,
  };

  if (r.keepEachCents < 0) {
    return [
      pays,
      {
        kind: "bars",
        picture: (
          <span className="flex w-full flex-col gap-3">
            <MoneyBar
              scale={scale}
              parts={[{ cents: r.priceCents, className: "bg-sky", label: price, icon: customer }]}
            />
            <MoneyBar
              scale={scale}
              parts={[{ cents: item.costCents, className: "bg-blush", label: cost, icon: itemPic }]}
            />
          </span>
        ),
        words: `But the ${name} costs you more`,
        big: cost,
      },
      {
        kind: "jar",
        picture: <Jar fill={0} size="lg" />,
        words: "Nothing is left. You lose",
        big: keep,
      },
      {
        kind: "day",
        picture: (
          <span className="flex flex-col items-center gap-4">
            <People count={faces} className="size-7" />
            <Jar fill={0} />
          </span>
        ),
        words: `${r.soldPerDay} people a day. You lose`,
        big: day,
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
            { cents: item.costCents, className: "bg-blush", label: cost, icon: itemPic },
            { cents: r.keepEachCents, className: "bg-sky opacity-30" },
          ]}
        />
      ),
      words: `This part buys the ${name}`,
      big: cost,
    },
    {
      kind: "bar",
      picture: (
        <MoneyBar
          scale={scale}
          parts={[
            { cents: item.costCents, className: "bg-blush opacity-30", icon: itemPic },
            { cents: r.keepEachCents, className: "bg-sage", label: keep, icon: <MiniJar /> },
          ]}
        />
      ),
      words: "This part is yours",
      big: keep,
    },
    {
      kind: "day",
      picture: (
        <span className="flex flex-col items-center gap-4">
          <People count={faces} className="size-7" />
          <Jar fill={0.9} layers={faces} />
        </span>
      ),
      words: `${r.soldPerDay} people a day fill your jar`,
      big: day,
    },
  ];
}

/**
 * Price changed: before vs after, so the trade-off is visible, not assumed.
 *   1. what one sale gives you now, 2. what it gives at the new price,
 *   3. how many people still buy, 4. both jars, one layer per person.
 * The jars share one scale and each layer is as thick as one person's money, so
 * "fewer people, more each" (or the opposite) adds up in front of you.
 */
function compareSteps(item: MenuItem, now: Outcome, next: Outcome): Step[] {
  const name = item.name.toLowerCase();
  const newPrice = formatCents(next.priceCents);
  const scale = Math.max(now.priceCents, next.priceCents, item.costCents);
  const loses = next.keepEachCents < 0;
  const money = (cents: number) => (cents < 0 ? `lose ${formatCents(-cents)}` : formatCents(cents));

  const row = (label: string, r: Outcome, dim = false) => (
    <span
      key={label}
      className={`flex w-full items-center gap-3 motion-safe:transition-opacity motion-safe:duration-500 ${dim ? "opacity-40" : ""}`}
    >
      <span className="w-14 shrink-0 text-left text-xl font-bold">{label}</span>
      <SaleBar item={item} r={r} scale={scale} />
    </span>
  );

  const fewer = next.soldPerDay < now.soldPerDay;
  const more = next.soldPerDay > now.soldPerDay;
  const verdict = compareOutcomes(now, next);
  const full = Math.max(now.keepPerDayCents, next.keepPerDayCents, 1) / 0.9;
  const jar = (label: string, r: Outcome) => (
    <span key={label} className="flex flex-col items-center gap-2">
      <span className="text-xl font-bold">{label}</span>
      <Jar
        fill={r.keepPerDayCents > 0 ? r.keepPerDayCents / full : 0}
        layers={r.keepPerDayCents > 0 ? Math.min(r.soldPerDay, 40) : 0}
      />
      <span className="text-2xl font-bold tabular-nums">{money(r.keepPerDayCents)}</span>
    </span>
  );

  return [
    {
      kind: "each",
      picture: <span className="flex w-full flex-col gap-3">{row("Now", now)}</span>,
      words: `Now, each ${name} gives you`,
      big: formatCents(now.keepEachCents),
    },
    {
      kind: "each",
      picture: (
        <span className="flex w-full flex-col gap-3">
          {row("Now", now, true)}
          {row("New", next)}
        </span>
      ),
      words: loses
        ? `At ${newPrice}, you lose on each one`
        : next.keepEachCents >= now.keepEachCents
          ? `At ${newPrice}, each one gives you more`
          : `At ${newPrice}, each one gives you less`,
      big: `${formatCents(now.keepEachCents)} → ${money(next.keepEachCents)}`,
    },
    {
      kind: "people",
      picture: <PeopleChange from={now.soldPerDay} to={next.soldPerDay} />,
      words: fewer
        ? `But some people won't pay ${newPrice}`
        : more
          ? `At ${newPrice}, more people buy it`
          : "The same people buy it",
      big: `${now.soldPerDay} → ${next.soldPerDay} people`,
    },
    {
      kind: "jars",
      picture: (
        <span className="flex flex-col items-center gap-3">
          <span className="flex items-end justify-center gap-12">
            {jar("Now", now)}
            {jar("New", next)}
          </span>
          <span className="text-base text-ink-soft">1 stripe = 1 person</span>
        </span>
      ),
      words:
        next.keepPerDayCents < 0
          ? "So you lose money every day"
          : verdict === "more"
            ? "So your jar gets more money"
            : verdict === "less"
              ? "So your jar gets less money"
              : "Your jar stays about the same",
      big: `${money(now.keepPerDayCents)} → ${money(next.keepPerDayCents)}`,
    },
  ];
}

const fadeIn =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out starting:translate-y-2 starting:opacity-0";

const navBtn =
  "flex min-h-touch flex-1 items-center justify-center gap-2 rounded-tile text-2xl font-bold transition-transform disabled:opacity-40 motion-safe:active:scale-[0.98]";

export function WhatIfStory({
  item,
  now,
  next,
  onClose,
}: {
  item: MenuItem;
  now: Outcome;
  /** Outcome at the new price. Same as `now` when the price was not changed. */
  next: Outcome;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState(0);
  useEffect(() => ref.current?.showModal(), []);

  const changed = next.priceCents !== now.priceCents;
  const all = changed ? compareSteps(item, now, next) : basicSteps(item, now);
  const step = all[at];
  const last = at === all.length - 1;
  const say = `${step.words} ${step.big}`;

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
          <span className="text-2xl font-bold tabular-nums">
            {changed
              ? `${formatCents(now.priceCents)} → ${formatCents(next.priceCents)}`
              : formatCents(now.priceCents)}
          </span>
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
        <div key={step.kind} className={`flex h-72 w-full items-center justify-center ${fadeIn}`}>
          {step.picture}
        </div>
        <div key={at} className={`flex w-full flex-col items-center gap-3 ${fadeIn}`}>
          <p className="flex h-24 items-center text-2xl font-semibold sm:h-16">{step.words}</p>
          <p
            className={`flex h-16 items-center leading-none font-bold tabular-nums ${step.big.includes("→") ? "text-4xl sm:text-5xl" : "text-hero"}`}
          >
            {step.big}
          </p>
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
