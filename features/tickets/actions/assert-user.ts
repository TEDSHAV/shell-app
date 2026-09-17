"use server";

import { getCurrentUserUsuarioId } from "@/actions/requisiciones";
import { createAdminClient } from "@/lib/supabase/server";

export async function require_ticket_user(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createAdminClient>>; user_id: number }
  | { ok: false; error: string }
> {
  const user_id = await getCurrentUserUsuarioId();
  if (!user_id) {
    return { ok: false, error: "Inicia sesión para usar tickets." };
  }
  const supabase = await createAdminClient();
  return { ok: true, supabase, user_id };
}
