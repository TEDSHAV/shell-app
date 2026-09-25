import { canManageUsuariosPrisma } from "@/actions/ted";
import { createAdminClient } from "@/lib/supabase/server";

export async function require_ted_accesos() {
  const allowed = await canManageUsuariosPrisma();
  if (!allowed) {
    throw new Error("Solo TED con permiso de usuarios puede gestionar accesos.");
  }
  return createAdminClient();
}

export function num(value: unknown): number {
  return Number(value);
}
