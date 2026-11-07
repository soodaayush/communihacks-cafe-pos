import { Icon } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import { formatDollars } from "@/lib/money";
import { Person } from "./pictures";

export interface MoneyInHandProps {
  /** "Today" or "This week" */
  label: string;
  /** What customers paid. */
  inCents: number;
  /** What the café spent buying stock. */
  boughtCents: number;
}

const dollars = (cents: number) => Math.round(cents / 100) * 100;

function Tile({
  picture,
  word,
  cents,
  tone,
}: {
  picture: React.ReactNode;
  word: string;
  cents: number;
  tone: string;
}) {
  return (
    <div
      className={`flex h-36 flex-1 flex-col items-center justify-center gap-1 rounded-2xl ${tone}`}
    >
      {picture}
      <span className="text-lg">{word}</span>
      <span className="text-3xl font-bold tabular-nums">{formatDollars(cents)}</span>
    </div>
  );
}

const sign = "text-center text-5xl leading-none font-bold text-ink/60";

/** Customers paid − we bought = in hand. Whole dollars, rounded first so the parts add up. */
export function MoneyInHand({ label, inCents, boughtCents }: MoneyInHandProps) {
  const paid = dollars(inCents);
  const bought = dollars(boughtCents);
  const left = paid - bought;
  const short = left < 0;
  const say = short
    ? `${label}, customers paid ${formatDollars(paid)}. We bought ${formatDollars(bought)}. We are short by ${formatDollars(-left)}.`
    : `${label}, customers paid ${formatDollars(paid)}. We bought ${formatDollars(bought)}. We have ${formatDollars(left)} in hand.`;

  return (
    <section className="flex flex-col gap-4 rounded-tile bg-white p-5 ring-1 ring-ink/10">
      <div className="flex min-h-16 items-center gap-4">
        <h2 className="flex-1 text-2xl font-bold">Money {label.toLowerCase()}</h2>
        <SpeakButton text={say} />
      </div>
      <div className="flex flex-1 flex-col items-stretch justify-center gap-2 lg:flex-row lg:items-center">
        <Tile
          picture={<Person className="size-10" />}
          word="Customers paid"
          cents={paid}
          tone="bg-sage/40"
        />
        <span aria-hidden className={sign}>
          −
        </span>
        <Tile
          picture={<Icon name="cart" className="size-10" />}
          word="We bought"
          cents={bought}
          tone="bg-blush/50"
        />
        <span aria-hidden className={sign}>
          =
        </span>
        <Tile
          picture={<Icon name="coin" className="size-10" />}
          word={short ? "Short by" : "In hand"}
          cents={Math.abs(left)}
          tone={`ring-2 ${short ? "bg-butter/70 ring-butter" : "bg-sage/70 ring-sage"}`}
        />
      </div>
    </section>
  );
}
