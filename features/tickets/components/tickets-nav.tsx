"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tickets", label: "Nuevo ticket" },
  { href: "/tickets/mios", label: "Mis tickets" },
];

export function TicketsNav() {
  const path = usePathname();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {LINKS.map((link) => {
        const active = path === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              active
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
