"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isTedMember } from "@/actions/ted";
import {
  DEV_DB_COOKIE,
  is_dev_db_switcher_enabled,
  parse_dev_db_target,
  production_public_bundle,
  type DevDbTarget,
} from "@/lib/supabase/dev-db";

export async function switchDevDbTarget(raw_target: string) {
  if (!is_dev_db_switcher_enabled()) {
    throw new Error("El cambio de BD solo está disponible con next dev.");
  }
  const allowed = await isTedMember();
  if (!allowed) {
    throw new Error("Solo TED puede cambiar el entorno local.");
  }
  const target = parse_dev_db_target(raw_target);
  if (target === "production" && !production_public_bundle()) {
    throw new Error("Faltan DEV_SUPABASE_PROD_* en .env.local.");
  }
  const store = await cookies();
  store.set(DEV_DB_COOKIE, target, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/auth/login?devdb=1");
}
