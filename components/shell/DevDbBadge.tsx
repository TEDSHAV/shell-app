"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  is_dev_db_switcher_enabled,
  sync_browser_dev_db_target,
  type DevDbTarget,
} from "@/lib/supabase/dev-db";

export function DevDbBadge() {
  const pathname = usePathname();
  const [target, setTarget] = useState<DevDbTarget | null>(null);

  useEffect(() => {
    if (!is_dev_db_switcher_enabled()) {
      setTarget(null);
      return;
    }
    setTarget(sync_browser_dev_db_target());
  }, [pathname]);

  if (!target) return null;

  const is_prod = target === "production";
  return (
    <Link
      href="/ted"
      title="Cambiar entorno local (TED)"
      className={
        is_prod
          ? "hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white"
          : "hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-600 text-white"
      }
    >
      {is_prod ? "Prod (o)" : "Staging (g)"}
    </Link>
  );
}
