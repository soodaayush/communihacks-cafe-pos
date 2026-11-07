import { Icon } from "@/components/icons/Icon";

/**
 * "Change how many there are": a small round pencil, bottom-right of a tile. One tap opens the count
 * sheet. It is an icon only, so the name is for screen readers.
 */
export function CountButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Count ${name}`}
      title="Count"
      onClick={onClick}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cream text-ink-soft ring-1 ring-ink/15 transition-colors hover:bg-lavender/40 hover:text-ink motion-safe:active:scale-95"
    >
      <Icon name="pencil" className="size-6" />
    </button>
  );
}
