"use server";

import { revalidatePath } from "next/cache";
import { tarea_schema, type TareaInput } from "../schemas";
import { normalize_prisma_path } from "../lib/prisma-routes";
import { require_ted_plan_context } from "./assert-ted";
import { find_or_create_modulo_by_nombre } from "./modulo-actions";
import { iso_date } from "../lib/task-dates";
import { createAdminClient } from "@/lib/supabase/server";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
}

async function next_tarea_orden(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
): Promise<number> {
  const { data } = await supabase
    .from("ted_plan_tareas" as never)
    .select("orden")
    .eq("modulo_id", modulo_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Number((data as { orden?: number } | null)?.orden ?? 0) + 1;
}

export async function save_plan_tarea(
  raw: TareaInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = tarea_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;

  let modulo_id = input.modulo_id ?? 0;
  if (modulo_id <= 0) {
    if (!input.app_id) {
      return { ok: false, error: "Selecciona una aplicación." };
    }
    const created = await find_or_create_modulo_by_nombre(
      input.modulo_nombre_nuevo ?? "",
      input.app_id,
    );
    if (!created.ok) return created;
    modulo_id = created.id;
  }

  const tipo = input.entregable_tipo;
  const ruta =
    tipo === "vista" ? normalize_prisma_path(input.entregable_ruta ?? "") : null;
  const comentario =
    tipo === "comentario" ? (input.entregable_comentario ?? "").trim() : null;

  if (tipo === "vista" && !ruta) {
    return { ok: false, error: "Indica la ruta de la vista en Prisma." };
  }
  if (tipo === "comentario" && !comentario) {
    return { ok: false, error: "Escribe el comentario de entregable." };
  }
  if (tipo === "version") {
    return {
      ok: false,
      error: "El entregable por versión de módulo estará en una fase posterior.",
    };
  }

  const now = new Date().toISOString();
  const no_solicitada = Boolean(input.no_solicitada);
  const avance = no_solicitada ? 0 : input.avance;
  const fecha_inicio = iso_date(input.fecha_inicio);
  const fecha_fin = iso_date(input.fecha_fin) ?? fecha_inicio;
  const payload = {
    modulo_id,
    titulo: input.titulo,
    origen: input.origen,
    avance,
    no_solicitada,
    completada: !no_solicitada && avance >= 100,
    entregable_tipo: tipo,
    entregable_ruta: ruta,
    entregable_comentario: comentario,
    completada_at: !no_solicitada && avance >= 100 ? now : null,
    completada_by: !no_solicitada && avance >= 100 ? user_id : null,
    fecha_inicio,
    fecha_fin,
  };

  if (input.id && input.id > 0) {
    const { error } = await supabase
      .from("ted_plan_tareas" as never)
      .update(payload as never)
      .eq("id", input.id);
    if (error) {
      console.error("[planificacion] update tarea:", error);
      return { ok: false, error: "No se pudo actualizar la tarea." };
    }
    revalidate_plan();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("ted_plan_tareas" as never)
    .insert({
      ...payload,
      created_by: user_id,
      orden: await next_tarea_orden(supabase, modulo_id),
    } as never)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[planificacion] insert tarea:", error);
    return { ok: false, error: "No se pudo crear la tarea." };
  }
  revalidate_plan();
  return { ok: true, id: Number((data as { id: number }).id) };
}

export async function delete_plan_tarea(
  tarea_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(tarea_id) || tarea_id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_tareas" as never)
    .delete()
    .eq("id", tarea_id);
  if (error) {
    console.error("[planificacion] delete tarea:", error);
    return { ok: false, error: "No se pudo eliminar la tarea." };
  }
  revalidate_plan();
  return { ok: true };
}

export async function toggle_plan_tarea(
  tarea_id: number,
  completada: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(tarea_id) || tarea_id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const { error } = await supabase
    .from("ted_plan_tareas" as never)
    .update({
      completada,
      no_solicitada: false,
      avance: completada ? 100 : 0,
      completada_at: completada ? new Date().toISOString() : null,
      completada_by: completada ? user_id : null,
    } as never)
    .eq("id", tarea_id);
  if (error) {
    console.error("[planificacion] toggle tarea:", error);
    return { ok: false, error: "No se pudo cambiar el estado." };
  }
  revalidate_plan();
  return { ok: true };
}
