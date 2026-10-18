"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Ledger", match: (p: string) => p === "/" || p.startsWith("/week") },
  { href: "/cover", label: "Buy cover", match: (p: string) => p.startsWith("/cover") },
  { href: "/policies", label: "My policies", match: (p: string) => p.startsWith("/policies") },
  { href: "/pool", label: "Pool", match: (p: string) => p.startsWith("/pool") },
  { href: "/how", label: "How it works", match: (p: string) => p.startsWith("/how") },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Primary">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} aria-current={link.match(pathname) ? "page" : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
