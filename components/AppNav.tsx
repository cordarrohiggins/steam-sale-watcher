"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deals", label: "Browse deals" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
];

function isCurrentPage(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname();

  const visibleLinks = navLinks.filter(
    (link) => !isCurrentPage(pathname, link.href)
  );

  return (
    <nav className="flex flex-wrap items-center gap-5">
      {visibleLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm text-slate-400 transition hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}