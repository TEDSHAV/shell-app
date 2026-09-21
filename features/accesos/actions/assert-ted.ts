import { isTedMember } from "@/actions/ted";
import { createAdminClient } from "@/lib/supabase/server";

export async function require_ted_accesos() {
  const allowed = await isTedMember();
  if (!allowed) {
    throw new Error("Solo TED puede gestionar accesos.");
  }
  return createAdminClient();
}

export function num(value: unknown): number {
  return Number(value);
}
