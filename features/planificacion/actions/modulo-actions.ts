"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { modulo_schema, type ModuloInput } from "../schemas";
import { require_ted_plan_context } from "./assert-ted";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/importar");
}

async function replace_modulo_apps(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
  app_ids: number[],
): Promise<string | null> {
  const unique = [...new Set(app_ids.filter((id) => id > 0))];
  if (unique.length === 0) return "Elige al menos una app.";
  const { error: del_error } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .delete()
    .eq("modulo_id", modulo_id);
  if (del_error) return del_error.message;
  const { error: ins_error } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .insert(
      unique.map((app_id) => ({ modulo_id, app_id })) as never,
    );
  if (ins_error) return ins_error.message;
  const { error: app_error } = await supabase
    .from("ted_plan_modulos" as never)
    .update({ app_id: unique[0] } as never)
    .eq("id", modulo_id);
  return app_error?.message ?? null;
}

async function ensure_modulo_apps(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
  app_ids: number[],
): Promise<string | null> {
  const unique = [...new Set(app_ids.filter((id) => id > 0))];
  if (unique.length === 0) return "Elige al menos una app.";
  const { error } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .upsert(
      unique.map((app_id) => ({ modulo_id, app_id })) as never,
      { onConflict: "modulo_id,app_id" },
    );
  return error?.message ?? null;
}

async function replace_participantes(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
  participante_ids: number[],
) {
  const { error: del_error } = await supabase
    .from("ted_plan_modulo_participantes" as never)
    .delete()
    .eq("modulo_id", modulo_id);
  if (del_error) {
    return del_error.message;
  }
  if (participante_ids.length === 0) return null;
  const { error: ins_error } = await supabase
    .from("ted_plan_modulo_participantes" as never)
    .insert(
      participante_ids.map((usuario_id) => ({ modulo_id, usuario_id })) as never,
    );
  return ins_error?.message ?? null;
}

export async function save_plan_modulo(
  raw: ModuloInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = modulo_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;
  const fecha =
    input.fecha_objetivo && input.fecha_objetivo.length > 0
      ? input.fecha_objetivo
      : null;
  const app_ids = [...new Set(input.app_ids)];
  const payload = {
    app_id: app_ids[0],
    nombre: input.nombre,
    subtitulo: input.subtitulo || null,
    trimestre_entrega: input.trimestre_entrega,
    anio: input.anio,
    fecha_objetivo: fecha,
  };

  let modulo_id = input.id ?? 0;
  if (modulo_id > 0) {
    const { error } = await supabase
      .from("ted_plan_modulos" as never)
      .update(payload as never)
      .eq("id", modulo_id);
    if (error) {
      console.error("[planificacion] update modulo:", error);
      return { ok: false, error: "No se pudo actualizar el módulo." };
    }
  } else {
    const { data, error } = await supabase
      .from("ted_plan_modulos" as never)
      .insert({ ...payload, created_by: user_id } as never)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[planificacion] insert modulo:", error);
      return { ok: false, error: "No se pudo crear el módulo." };
    }
    modulo_id = Number((data as { id: number }).id);
  }

  const apps_error = await replace_modulo_apps(supabase, modulo_id, app_ids);
  if (apps_error) {
    console.error("[planificacion] modulo apps:", apps_error);
    return { ok: false, error: "El módulo se guardó, pero no se vincularon las apps." };
  }

  const part_error = await replace_participantes(
    supabase,
    modulo_id,
    input.participante_ids,
  );
  if (part_error) {
    console.error("[planificacion] participantes:", part_error);
    return { ok: false, error: "El módulo se guardó, pero fallaron los participantes." };
  }

  revalidate_plan();
  return { ok: true, id: modulo_id };
}

export async function delete_plan_modulo(
  modulo_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(modulo_id) || modulo_id <= 0) {
    return { ok: false, error: "Módulo inválido." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_modulos" as never)
    .delete()
    .eq("id", modulo_id);
  if (error) {
    console.error("[planificacion] delete modulo:", error);
    return { ok: false, error: "No se pudo borrar el módulo." };
  }
  revalidate_plan();
  return { ok: true };
}

async function app_ids_of_modulo(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  modulo_id: number,
): Promise<number[]> {
  const { data: row } = await supabase
    .from("ted_plan_modulos" as never)
    .select("app_id")
    .eq("id", modulo_id)
    .maybeSingle();
  const { data: links } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .select("app_id")
    .eq("modulo_id", modulo_id);
  const ids = [
    ...((links ?? []) as Array<{ app_id: number }>).map((item) =>
      Number(item.app_id),
    ),
  ];
  const owner = Number((row as { app_id?: number } | null)?.app_id ?? 0);
  if (owner > 0 && !ids.includes(owner)) ids.push(owner);
  return [...new Set(ids.filter((id) => id > 0))];
}

function is_exclusive_to_app(app_ids: number[], app_id: number): boolean {
  return app_ids.length === 1 && app_ids[0] === app_id;
}

export async function find_or_create_modulo_by_nombre(
  nombre: string,
  app_id: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const trimmed = nombre.trim();
  if (!trimmed) return { ok: false, error: "El nombre del módulo es obligatorio." };
  if (!Number.isInteger(app_id) || app_id <= 0) {
    return { ok: false, error: "Selecciona una aplicación." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const { data: existing, error: find_error } = await supabase
    .from("ted_plan_modulos" as never)
    .select("id, app_id")
    .ilike("nombre", trimmed)
    .is("archived_at", null);
  if (find_error) {
    console.error("[planificacion] find modulo:", find_error);
    return { ok: false, error: "No se pudo buscar el módulo." };
  }
  const candidates = (existing ?? []) as Array<{
    id: number;
    app_id: number | null;
  }>;
  const candidate_ids = candidates.map((row) => Number(row.id));
  let modulo_id = 0;
  if (candidate_ids.length > 0) {
    const { data: links } = await supabase
      .from("ted_plan_modulo_apps" as never)
      .select("modulo_id, app_id")
      .in("modulo_id", candidate_ids);
    const apps_by_mod = new Map<number, number[]>();
    for (const row of (links ?? []) as Array<{
      modulo_id: number;
      app_id: number;
    }>) {
      const list = apps_by_mod.get(row.modulo_id) ?? [];
      if (!list.includes(row.app_id)) list.push(row.app_id);
      apps_by_mod.set(row.modulo_id, list);
    }
    for (const candidate of candidates) {
      const id = Number(candidate.id);
      const owner = Number(candidate.app_id ?? 0);
      const apps = apps_by_mod.get(id) ?? (owner > 0 ? [owner] : []);
      if (is_exclusive_to_app(apps, app_id)) {
        modulo_id = id;
        break;
      }
    }
  }
  if (modulo_id <= 0) {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from("ted_plan_modulos" as never)
      .insert({
        app_id,
        nombre: trimmed,
        trimestre_entrega: "T1",
        anio: year,
        created_by: user_id,
      } as never)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[planificacion] create-if-new:", error);
      return { ok: false, error: "No se pudo crear el módulo." };
    }
    modulo_id = Number((data as { id: number }).id);
  }
  const link_error = await ensure_modulo_apps(supabase, modulo_id, [app_id]);
  if (link_error) {
    console.error("[planificacion] link modulo app:", link_error);
    return { ok: false, error: "No se pudo vincular el módulo a la app." };
  }
  return { ok: true, id: modulo_id };
}

export async function resolve_modulo_for_app(
  app_id: number | undefined,
  modulo_id: number,
  modulo_nombre_nuevo: string | null | undefined,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!app_id || app_id <= 0) {
    if (modulo_id > 0) return { ok: true, id: modulo_id };
    return { ok: false, error: "Selecciona una aplicación." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;
  if (modulo_id > 0) {
    const apps = await app_ids_of_modulo(supabase, modulo_id);
    if (apps.includes(app_id)) return { ok: true, id: modulo_id };
    const { data } = await supabase
      .from("ted_plan_modulos" as never)
      .select("nombre")
      .eq("id", modulo_id)
      .maybeSingle();
    const nombre =
      (modulo_nombre_nuevo ?? "").trim() ||
      String((data as { nombre?: string } | null)?.nombre ?? "");
    return find_or_create_modulo_by_nombre(nombre, app_id);
  }
  return find_or_create_modulo_by_nombre(modulo_nombre_nuevo ?? "", app_id);
}
