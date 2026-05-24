"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deals", label: "Browse deals" },
  { href: "/free-games", label: "Free games" },
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
  const router = useRouter();

  const visibleLinks = navLinks.filter(
    (link) => !isCurrentPage(pathname, link.href)
  );

  function handleGoBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <nav className="flex flex-wrap items-center gap-5">
      {pathname !== "/" && (
        <button
          type="button"
          onClick={handleGoBack}
          className="text-sm text-slate-400 transition hover:text-white"
        >
          Go back
        </button>
      )}

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