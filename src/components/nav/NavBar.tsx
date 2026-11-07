"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/register", icon: "🛒", label: "Register" },
  { href: "/stock", icon: "📦", label: "Stock" },
  { href: "/money", icon: "💰", label: "Money" },
  { href: "/whatif", icon: "🤔", label: "What if" },
] as const;

// TODO(dev2): swap emoji for picture icons.
export function NavBar() {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-4 gap-3 border-t border-ink/10 bg-lavender/60 px-4 py-3">
      {LINKS.map(({ href, icon, label }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-touch items-center justify-center gap-3 rounded-tile text-xl font-semibold ${active ? "bg-white ring-1 ring-ink/15" : "text-ink-soft"}`}
          >
            <span aria-hidden className="text-3xl">
              {icon}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
