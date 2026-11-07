import { Icon, type IconName } from "@/components/icons/Icon";

export interface StockLevelProps {
  stock: number;
  reorderLevel: number;
  /** Visual max, e.g. a full shelf. */
  capacity?: number;
  /** Force "Running low", e.g. when the forecast says it runs out soon. */
  low?: boolean;
  /** Extra words on the right of the label, e.g. "35% full". */
  note?: string;
}

type Level = "out" | "low" | "ok";

// Colour never works alone: each level also has its own icon and words.
const LOOK: Record<Level, { bar: string; icon: IconName; label: string }> = {
  out: { bar: "bg-blush", icon: "cross", label: "None left" },
  low: { bar: "bg-stock-low", icon: "alert", label: "Running low" },
  ok: { bar: "bg-sage", icon: "check", label: "Plenty" },
};

export function StockLevel({ stock, reorderLevel, capacity, low = false, note }: StockLevelProps) {
  const level: Level = stock <= 0 ? "out" : low || stock <= reorderLevel ? "low" : "ok";
  const look = LOOK[level];
  const max = Math.max(capacity ?? reorderLevel * 4, stock, 1);
  return (
    <div>
      <div className="h-4 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <div
          className={`h-full rounded-full ${look.bar}`}
          style={{ width: `${(stock / max) * 100}%` }}
        />
      </div>
      <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
        <span
          aria-hidden
          className={`flex size-7 items-center justify-center rounded-full ${look.bar}`}
        >
          <Icon name={look.icon} className="size-4" />
        </span>
        {look.label}
        {note && <span className="ml-auto text-ink-soft tabular-nums">{note}</span>}
      </p>
    </div>
  );
}
