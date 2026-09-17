"use server";

import { isTedMember } from "@/actions/ted";
import { getCurrentUserUsuarioId } from "@/actions/requisiciones";
import { createAdminClient } from "@/lib/supabase/server";

export type TedPlanContext = {
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
  user_id: number | null;
};

export async function require_ted_plan_context(): Promise<
  { ok: true; ctx: TedPlanContext } | { ok: false; error: string }
> {
  const allowed = await isTedMember();
  if (!allowed) {
    return { ok: false, error: "Solo miembros TED pueden usar planificación." };
  }
  const user_id = await getCurrentUserUsuarioId();
  const supabase = await createAdminClient();
  return { ok: true, ctx: { supabase, user_id } };
}
