"use server";

import {
  canReadObjetivosArea,
  canWriteObjetivos,
  isTedMember,
} from "@/actions/ted";
import { getCurrentUserUsuarioId } from "@/actions/requisiciones";
import { createAdminClient } from "@/lib/supabase/server";

export type TedPlanContext = {
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
  user_id: number | null;
};

async function plan_context(): Promise<TedPlanContext> {
  const user_id = await getCurrentUserUsuarioId();
  const supabase = await createAdminClient();
  return { supabase, user_id };
}

export async function require_ted_plan_context(): Promise<
  { ok: true; ctx: TedPlanContext } | { ok: false; error: string }
> {
  const allowed = await isTedMember();
  if (!allowed) {
    return { ok: false, error: "Solo miembros TED pueden usar planificación." };
  }
  return { ok: true, ctx: await plan_context() };
}

export async function require_objetivos_read_context(): Promise<
  { ok: true; ctx: TedPlanContext } | { ok: false; error: string }
> {
  const allowed = await canReadObjetivosArea();
  if (!allowed) {
    return { ok: false, error: "No tienes acceso a objetivos del periodo." };
  }
  return { ok: true, ctx: await plan_context() };
}

export async function require_objetivos_write_context(): Promise<
  { ok: true; ctx: TedPlanContext } | { ok: false; error: string }
> {
  const allowed = await canWriteObjetivos();
  if (!allowed) {
    return { ok: false, error: "No puedes editar objetivos del periodo." };
  }
  return { ok: true, ctx: await plan_context() };
}
