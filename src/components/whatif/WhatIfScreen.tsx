"use client";

import Image from "next/image";
import { use, useState } from "react";
import { WhatIfSlider } from "@/components/money/WhatIfSlider";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { imageUrl } from "@/lib/integrations/cloudinary";
import { formatCents } from "@/lib/money";
import type { MenuItem } from "@/lib/types";
import { PRICE_STEP_CENTS, compare, outcome, priceRange, type Outcome } from "@/lib/whatif";
import type { WhatIfData } from "@/lib/whatif-data";
import { ItemPicker, TINT } from "./ItemPicker";
import { WhatIfStory } from "./WhatIfStory";
import { useTweened } from "./motion";
import { Jar } from "./pictures";

const fadeIn =
  "motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-out starting:translate-y-1 starting:opacity-0";

const VERDICT = {
  more: { bg: "bg-sage", arrow: "↑", text: "More money for you" },
  less: { bg: "bg-blush", arrow: "↓", text: "Less money for you" },
  same: { bg: "bg-sky", arrow: "=", text: "About the same" },
} as const;

export function WhatIfScreen({ data }: { data: Promise<WhatIfData> }) {
  const { menu, soldPerDay } = use(data);
  const [itemId, setItemId] = useState(menu[0]?.id);
  const item = menu.find((m) => m.id === itemId);
  const [priceCents, setPriceCents] = useState(item?.priceCents ?? 0);
  const [showHow, setShowHow] = useState(false);
  const [picking, setPicking] = useState(false);

  if (!item) return <p className="text-xl text-ink-soft">No menu items yet.</p>;

  function pick(next: MenuItem) {
    setItemId(next.id);
    setPriceCents(next.priceCents);
    setPicking(false);
  }

  const soldNow = soldPerDay[item.id] ?? 0;
  const now = outcome(item, soldNow, item.priceCents);
  const next = outcome(item, soldNow, priceCents);
  const changed = priceCents !== item.priceCents;
  const verdict = compare(now, next);
  const { minCents, maxCents } = priceRange(item);
  // Both jars share one scale, so the bigger jar is simply the one with more money.
  const fullJar = Math.max(now.keepPerDayCents, next.keepPerDayCents, 1) / 0.9;

  const say = changed
    ? `${VERDICT[verdict].text}. Now you keep ${formatCents(now.keepPerDayCents)} a day. ` +
      `At ${formatCents(priceCents)}, you keep ${formatCents(next.keepPerDayCents)} a day.`
    : `Now you keep ${formatCents(now.keepPerDayCents)} a day from ${item.name}.`;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
      <div className="flex flex-col gap-6 lg:overflow-y-auto lg:p-1">
        <section className="flex flex-col gap-5 rounded-tile bg-white p-6 ring-1 ring-ink/10">
          {/* The chosen item. Fixed height (the picture's), so long names never resize the card. */}
          <div className="flex h-20 items-center gap-4">
            <span
              key={item.id}
              className={`flex size-20 shrink-0 items-center justify-center rounded-2xl ${TINT[item.category] ?? "bg-lavender/50"} ${fadeIn}`}
            >
              <Image
                src={imageUrl(item.imagePublicId)}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="size-16"
              />
            </span>
            <span
              key={`${item.id}-name`}
              className={`line-clamp-2 min-w-0 flex-1 text-2xl leading-tight font-bold sm:text-3xl ${fadeIn}`}
            >
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-label="Change item"
              className="flex min-h-14 min-w-14 shrink-0 items-center justify-center gap-2 rounded-full bg-cream px-4 text-xl font-semibold ring-1 ring-ink/10 motion-safe:transition-transform motion-safe:active:scale-95 sm:px-5"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="currentColor">
                <rect x="3" y="3" width="8" height="8" rx="2" />
                <rect x="13" y="3" width="8" height="8" rx="2" />
                <rect x="3" y="13" width="8" height="8" rx="2" />
                <rect x="13" y="13" width="8" height="8" rx="2" />
              </svg>
              <span className="hidden sm:inline">Change</span>
            </button>
          </div>
          <hr className="border-ink/10" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">New price</h2>
              <p className="text-lg text-ink-soft tabular-nums">
                Now {formatCents(item.priceCents)}
              </p>
            </div>
            <span className="text-hero leading-none font-bold tabular-nums">
              {formatCents(priceCents)}
            </span>
          </div>
          <WhatIfSlider
            item={item}
            priceCents={priceCents}
            minCents={minCents}
            maxCents={maxCents}
            stepCents={PRICE_STEP_CENTS}
            onChange={setPriceCents}
          />
          {/* Always takes its space, so the card never grows or shrinks; it just fades in. */}
          <button
            type="button"
            onClick={() => setPriceCents(item.priceCents)}
            className={`min-h-14 self-start rounded-full bg-cream px-5 text-xl font-semibold ring-1 ring-ink/10 transition-discrete motion-safe:transition-[opacity,visibility] motion-safe:duration-300 ${changed ? "visible opacity-100" : "invisible opacity-0"}`}
          >
            Back to {formatCents(item.priceCents)}
          </button>
        </section>
      </div>

      <div className="flex flex-col gap-5 lg:overflow-y-auto lg:p-1" aria-live="polite">
        <div
          className={`flex h-28 items-center gap-4 rounded-tile px-5 ring-1 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-500 ${changed ? `${VERDICT[verdict].bg} ring-transparent` : "bg-white ring-ink/10"}`}
        >
          {/* Fixed slot for the arrow, so the words never slide sideways. */}
          <span aria-hidden className="w-12 text-center text-hero leading-none font-bold">
            {changed && (
              <span key={verdict} className={`inline-block ${fadeIn}`}>
                {VERDICT[verdict].arrow}
              </span>
            )}
          </span>
          <p key={changed ? verdict : "start"} className={`flex-1 text-2xl font-bold ${fadeIn}`}>
            {changed ? VERDICT[verdict].text : "Move the slider"}
          </p>
          <SpeakButton text={say} />
        </div>

        {/* The main answer, by size: which jar has more money in it? */}
        <section className="rounded-tile bg-white p-6 ring-1 ring-ink/10">
          <h2 className="mb-5 text-center text-2xl font-semibold">Money you keep each day</h2>
          <div className="flex items-end justify-center">
            <JarColumn label="Now" result={now} fullJar={fullJar} />
            {/* The New jar opens its own space smoothly, so the Now jar slides over instead of jumping. */}
            <div
              aria-hidden={!changed}
              inert={!changed}
              className={`overflow-hidden motion-safe:transition-[width,margin,opacity] motion-safe:duration-500 motion-safe:ease-out ${changed ? "ml-8 w-36 opacity-100" : "ml-0 w-0 opacity-0"}`}
            >
              <JarColumn label="New" result={next} fullJar={fullJar} />
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setShowHow(true)}
          className="flex min-h-touch items-center justify-center gap-3 rounded-tile bg-lavender text-2xl font-bold transition-transform motion-safe:active:scale-[0.98]"
        >
          <span aria-hidden className="text-3xl">
            💡
          </span>
          Show me how
        </button>
      </div>

      {picking && (
        <ItemPicker
          menu={menu}
          selectedId={item.id}
          onPick={pick}
          onClose={() => setPicking(false)}
        />
      )}

      {showHow && (
        <WhatIfStory item={item} now={now} next={next} onClose={() => setShowHow(false)} />
      )}
    </div>
  );
}

function JarColumn({
  label,
  result,
  fullJar,
}: {
  label: string;
  result: Outcome;
  fullJar: number;
}) {
  const loses = result.keepPerDayCents < 0;
  const shown = useTweened(result.keepPerDayCents);
  return (
    <div className="flex w-36 shrink-0 flex-col items-center gap-2">
      <span className="text-xl font-bold">
        {label}{" "}
        <span className="font-normal text-ink-soft tabular-nums">
          {formatCents(result.priceCents)}
        </span>
      </span>
      <Jar fill={loses ? 0 : result.keepPerDayCents / fullJar} />
      {/* Same size for keep and lose, so swapping never moves anything; only the colour fades. */}
      <span
        className={`flex h-20 w-full flex-col items-center justify-center rounded-xl motion-safe:transition-colors motion-safe:duration-300 ${loses ? "bg-blush/70" : "bg-transparent"}`}
      >
        <span className="text-lg">{loses ? "You lose" : "You keep"}</span>
        <span className="text-3xl font-bold tabular-nums">
          {formatCents(Math.abs(Math.round(shown)))}
        </span>
      </span>
    </div>
  );
}
