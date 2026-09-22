"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DevDbTarget } from "@/lib/supabase/dev-db";

type Injected = {
  target: DevDbTarget;
  staging: { url: string } | null;
  production: { url: string } | null;
};

export function DevDbBadge() {
  const [target, setTarget] = useState<DevDbTarget | null>(null);

  useEffect(() => {
    const injected = (window as unknown as { __SHA_DEV_SB?: Injected }).__SHA_DEV_SB;
    if (injected?.target) setTarget(injected.target);
  }, []);

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
