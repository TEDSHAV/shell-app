"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { apps } from "@/config/apps";
import { cn } from "@/lib/utils";

export const AppNavigation = () => {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1 mr-2">
      {apps.map((app) => {
        const isExternal = ["drive", "inventario"].includes(app.id);
        return isExternal ? (
          <a
            key={app.id}
            href={app.upstreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <app.icon className="h-3.5 w-3.5" />
            {app.name}
          </a>
        ) : (
          <Link
            key={app.id}
            href={app.basePath}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              pathname.startsWith(app.basePath)
                ? cn(
                    "border font-medium",
                    app.badge.bg,
                    app.badge.text,
                    app.badge.border,
                  )
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            <app.icon className="h-3.5 w-3.5" />
            {app.name}
          </Link>
        );
      })}
    </nav>
  );
};
