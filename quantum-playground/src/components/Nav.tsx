"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/demos", label: "Demos" },
  { href: "/real-world", label: "Real World" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-auto font-serif text-lg font-semibold">
          Quantum <span className="text-accent">Playground</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${active ? "bg-card2 text-ink" : "text-soft hover:text-ink"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
