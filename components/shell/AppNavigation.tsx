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
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <app.icon className="h-3.5 w-3.5" />
          {app.name}
        </Link>
      ))}
    </nav>
  );
};
