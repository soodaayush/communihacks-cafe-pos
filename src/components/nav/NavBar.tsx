import Link from "next/link";

const LINKS = [
  { href: "/register", icon: "🛒", label: "Register" },
  { href: "/stock", icon: "📦", label: "Stock" },
  { href: "/money", icon: "💰", label: "Money" },
  { href: "/whatif", icon: "🤔", label: "What if" },
] as const;

// TODO(dev2): highlight the active screen; swap emoji for picture icons.
export function NavBar() {
  return (
    <nav className="grid grid-cols-4 gap-gap bg-lavender p-4">
      {LINKS.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          aria-label={label}
          className="flex min-h-touch items-center justify-center rounded-tile bg-cream text-number"
        >
          {icon}
        </Link>
      ))}
    </nav>
  );
}
