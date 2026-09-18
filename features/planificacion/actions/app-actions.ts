"use server";

import { revalidatePath } from "next/cache";
import { app_schema, type AppInput } from "../schemas";
import { require_ted_plan_context } from "./assert-ted";
import { slug_from_app_name } from "../lib/shell-plan-apps";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
}

export async function save_plan_app(
  raw: AppInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = app_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;

  if (input.id && input.id > 0) {
    const { data: current, error: load_error } = await supabase
      .from("ted_plan_apps" as never)
      .select("origen")
      .eq("id", input.id)
      .single();
    if (load_error || !current) {
      return { ok: false, error: "No se encontró la aplicación." };
    }
    const payload = {
      nombre: input.nombre,
      subtitulo: input.subtitulo || null,
    };
    const { error } = await supabase
      .from("ted_plan_apps" as never)
      .update(payload as never)
      .eq("id", input.id);
    if (error) {
      console.error("[planificacion] update app:", error);
      return { ok: false, error: "No se pudo actualizar la aplicación." };
    }
    revalidate_plan();
    return { ok: true, id: input.id };
  }

  let slug = slug_from_app_name(input.nombre);
  const { data: clash } = await supabase
    .from("ted_plan_apps" as never)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const { data, error } = await supabase
    .from("ted_plan_apps" as never)
    .insert({
      slug,
      nombre: input.nombre,
      subtitulo: input.subtitulo || null,
      origen: "custom",
      created_by: user_id,
    } as never)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[planificacion] insert app:", error);
    return { ok: false, error: "No se pudo crear la aplicación." };
  }
  revalidate_plan();
  return { ok: true, id: Number((data as { id: number }).id) };
}

export async function archive_plan_app(
  app_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(app_id) || app_id <= 0) {
    return { ok: false, error: "Aplicación inválida." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { data: current } = await gate.ctx.supabase
    .from("ted_plan_apps" as never)
    .select("origen")
    .eq("id", app_id)
    .single();
  if ((current as { origen?: string } | null)?.origen === "shell") {
    return { ok: false, error: "Las apps del Shell no se archivan desde aquí." };
  }
  const { error } = await gate.ctx.supabase
    .from("ted_plan_apps" as never)
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", app_id);
  if (error) {
    return { ok: false, error: "No se pudo archivar la aplicación." };
  }
  revalidate_plan();
  return { ok: true };
}
