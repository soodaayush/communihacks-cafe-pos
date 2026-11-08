"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { SoundToggle } from "@/components/nav/SoundToggle";

const LINKS: { href: string; icon: IconName; label: string }[] = [
  { href: "/register", icon: "cart", label: "Register" },
  { href: "/stock", icon: "boxes", label: "Stock" },
  { href: "/money", icon: "coin", label: "Money" },
];

export function NavBar() {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-[repeat(3,1fr)_auto] gap-3 border-t border-ink/10 bg-lavender/60 px-4 py-3">
      {LINKS.map(({ href, icon, label }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-touch items-center justify-center gap-3 rounded-tile text-xl font-semibold ${active ? "bg-white ring-1 ring-ink/15" : "text-ink-soft"}`}
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
