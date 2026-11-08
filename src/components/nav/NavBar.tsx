"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { SoundToggle } from "@/components/nav/SoundToggle";

const LINKS: { href: string; icon: IconName; label: string }[] = [
  { href: "/register", icon: "cart", label: "Register" },
  { href: "/stock", icon: "boxes", label: "Stock" },
  { href: "/money", icon: "coin", label: "Money" },
  { href: "/learn", icon: "book", label: "Learn" },
];

export function NavBar() {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-[repeat(4,1fr)_auto] gap-2 border-t border-ink/5 bg-paper/80 px-4 py-2.5 shadow-[0_-8px_24px_-16px_rgb(61_59_72/0.25)] backdrop-blur-md sm:gap-3">
      {LINKS.map(({ href, icon, label }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-touch items-center justify-center gap-3 rounded-tile text-xl font-semibold transition-colors ${active ? "bg-lavender/70 text-ink" : "text-ink-soft hover:bg-lavender/30 hover:text-ink"}`}
          >
            <Icon name={icon} className="size-10" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      <SoundToggle />
    </nav>
  );
}
