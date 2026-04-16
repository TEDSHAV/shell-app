"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { apps } from "@/config/apps";
import { cn } from "@/lib/utils";

export const AppNavigation = () => {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1 mr-2">
      {apps.map((app) => (
        <Link
          key={app.id}
          href={app.basePath}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
            pathname.startsWith(app.basePath)
              ? cn("border font-medium", app.badge.bg, app.badge.text, app.badge.border)
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <app.icon className="h-3.5 w-3.5" />
          {app.name}
        </Link>
      ))}
    </nav>
  );
};
