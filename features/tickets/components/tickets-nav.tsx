"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Plus } from "lucide-react";

const LINKS = [
  { href: "/tickets", label: "Nuevo ticket", icon: Plus },
  { href: "/tickets/mios", label: "Mis tickets", icon: Inbox },
];

export function TicketsNav() {
  const path = usePathname();
  return (
    <div className="mb-6 inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {LINKS.map((link) => {
        const active = path === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              active
                ? "bg-violet-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
