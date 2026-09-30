"use server";

import { revalidatePath } from "next/cache";
import { PLAN_TRIMESTRES, complete_tarea_schema, tarea_schema } from "../schemas";
import type { EntregableTipo, PlanTrimestre } from "../lib/types";
import { is_frozen_origen } from "../lib/origen-policy";
import { normalize_prisma_path } from "../lib/prisma-routes";
import { require_ted_plan_context } from "./assert-ted";
import { TED_DEPARTMENT_ID } from "../lib/ted-department";
import { resolve_modulo_for_apps } from "./modulo-actions";
import { iso_date } from "../lib/task-dates";
import {
  avance_from_descripcion,
  checks_in_descripcion,
} from "../lib/tarea-descripcion";
import {
  parse_tarea_checklist,
  stamp_check_times,
} from "../lib/tarea-checklist";
import { createAdminClient } from "@/lib/supabase/server";
import { sync_ticket_on_tarea_done } from "@/features/tickets/actions/ticket-actions";

function revalidate_plan() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/cubrir");
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

function parse_entregable(input: {
  entregable_tipo: EntregableTipo;
  entregable_ruta?: string | null;
  entregable_comentario?: string | null;
  entregable_unidad?: string | null;
  entregable_version?: string | null;
}):
  | { ok: true; tipo: EntregableTipo; ruta: string | null; comentario: string | null; unidad: string | null; version: string | null }
  | { ok: false; error: string } {
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
    const unidad = (input.entregable_unidad ?? "").trim();
    const version = (input.entregable_version ?? "").trim();
    if (!unidad || !version) {
      return {
        ok: false,
        error: "Indica la unidad de release y la versión.",
      };
    }
    return { ok: true, tipo, ruta: null, comentario: null, unidad, version };
  }
  return {
    ok: true,
    tipo,
    ruta,
    comentario,
    unidad: null,
    version: null,
  };
}

export async function save_plan_tarea(
  raw: unknown,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = tarea_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;

  if (!input.id && is_frozen_origen(input.origen)) {
    return {
      ok: false,
      error:
        "El plan inicial ya está cargado. Usa requerimiento, ticket, usuario o adicional.",
    };
  }
  let previous_checks = parse_tarea_checklist(input.checklist);
  if (input.id && input.id > 0) {
    const { data: current } = await supabase
      .from("ted_plan_tareas" as never)
      .select("origen, checklist")
      .eq("id", input.id)
      .maybeSingle();
    previous_checks = parse_tarea_checklist(
      (current as { checklist?: unknown } | null)?.checklist,
    );
    if (is_frozen_origen(input.origen)) {
      const current_origen = (current as { origen?: string } | null)?.origen;
      if (current_origen !== input.origen) {
        return {
          ok: false,
          error: "No se puede cambiar el origen a Plan inicial o Gerencia.",
        };
      }
    }
  }

  const resolved = await resolve_modulo_for_apps(
    [...new Set([...(input.app_ids ?? []), input.app_id ?? 0].filter((id) => id > 0))],
    input.modulo_ids?.[0] ?? input.modulo_id ?? 0,
    input.modulo_nombre_nuevo,
  );
  if (!resolved.ok) return resolved;
  const modulo_id = resolved.id;

  const no_solicitada = Boolean(input.no_solicitada);
  const descripcion = (input.descripcion ?? "").trim() || null;
  const derived = descripcion ? avance_from_descripcion(descripcion) : null;
  const sync =
    Boolean(input.sync_avance_checklist) && derived !== null && !no_solicitada;
  const avance = no_solicitada
    ? 0
    : sync && derived !== null
      ? derived
      : input.id
        ? input.avance
        : 0;
  const done = !no_solicitada && avance >= 100;
  const fecha_inicio = iso_date(input.fecha_inicio);
  const fecha_fin = iso_date(input.fecha_fin) ?? fecha_inicio;
  const now = new Date().toISOString();
  const payload = {
    modulo_id,
    titulo: input.titulo,
    descripcion,
    origen: input.origen,
    avance,
    no_solicitada,
    fecha_inicio,
    fecha_fin,
    trimestre: fecha_inicio ? null : (input.trimestre ?? null),
    asignado_id:
      (input.asignado_ids && input.asignado_ids[0]) ??
      input.asignado_id ??
      null,
    en_planificacion: true,
    objetivo_id: input.objetivo_id ?? null,
    checklist: stamp_check_times(
      previous_checks,
      checks_in_descripcion(descripcion ?? ""),
      now,
    ),
    sync_avance_checklist: sync,
    completada: done,
    completada_at: done ? now : null,
    completada_by: done ? user_id : null,
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
    const assigned = await replace_tarea_asignados(
      supabase,
      input.id,
      input.asignado_ids ??
        (input.asignado_id ? [input.asignado_id] : []),
    );
    if (!assigned.ok) return assigned;
    revalidate_plan();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("ted_plan_tareas" as never)
    .insert({
      ...payload,
      entregable_tipo: "ninguno",
      entregable_ruta: null,
      entregable_comentario: null,
      entregable_unidad: null,
      entregable_version: null,
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
  const new_id = Number((data as { id: number }).id);
  const assigned = await replace_tarea_asignados(
    supabase,
    new_id,
    input.asignado_ids ?? (input.asignado_id ? [input.asignado_id] : []),
  );
  if (!assigned.ok) return assigned;
  return { ok: true, id: new_id };
}

export async function complete_plan_tarea(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = complete_tarea_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;
  const entregable = parse_entregable(input);
  if (!entregable.ok) return entregable;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ted_plan_tareas" as never)
    .update({
      no_solicitada: false,
      avance: 100,
      completada: true,
      completada_at: now,
      completada_by: user_id,
      entregable_tipo: entregable.tipo,
      entregable_ruta: entregable.ruta,
      entregable_comentario: entregable.comentario,
      entregable_unidad: entregable.unidad,
      entregable_version: entregable.version,
    } as never)
    .eq("id", input.id);
  if (error) {
    console.error("[planificacion] complete tarea:", error);
    return { ok: false, error: "No se pudo marcar la tarea como lista." };
  }
  await sync_ticket_on_tarea_done(
    supabase,
    input.id,
    user_id,
    entregable.comentario ?? "",
  );
  revalidate_plan();
  return { ok: true };
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
  if (completada) {
    await sync_ticket_on_tarea_done(supabase, tarea_id, user_id, "");
  }
  revalidate_plan();
  return { ok: true };
}

export async function set_plan_tarea_avance(
  tarea_id: number,
  avance: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(tarea_id) || tarea_id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  const next = Math.min(100, Math.max(0, Math.round(avance)));
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const done = next >= 100;
  const { error } = await supabase
    .from("ted_plan_tareas" as never)
    .update({
      no_solicitada: false,
      avance: next,
      completada: done,
      completada_at: done ? new Date().toISOString() : null,
      completada_by: done ? user_id : null,
    } as never)
    .eq("id", tarea_id);
  if (error) {
    console.error("[planificacion] set avance:", error);
    return { ok: false, error: "No se pudo mover la tarea." };
  }
  if (done) {
    await sync_ticket_on_tarea_done(supabase, tarea_id, user_id, "");
  }
  revalidate_plan();
  return { ok: true };
}

export async function save_plan_tarea_progreso(input: {
  id: number;
  avance: number;
  descripcion: string;
  sync_avance: boolean;
}): Promise<{ ok: true; avance: number } | { ok: false; error: string }> {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const { data: current } = await supabase
    .from("ted_plan_tareas" as never)
    .select("checklist, no_solicitada")
    .eq("id", input.id)
    .maybeSingle();
  const row = current as {
    checklist?: unknown;
    no_solicitada?: boolean | null;
  } | null;
  if (row?.no_solicitada) {
    return { ok: false, error: "Esta tarea no cuenta en el porcentaje." };
  }
  const text = input.descripcion.trim() || null;
  const now = new Date().toISOString();
  const stamped = stamp_check_times(
    parse_tarea_checklist(row?.checklist),
    checks_in_descripcion(text ?? ""),
    now,
  );
  const derived = text ? avance_from_descripcion(text) : null;
  const sync = input.sync_avance && derived !== null;
  const avance = Math.min(
    100,
    Math.max(0, sync && derived !== null ? derived : Math.round(input.avance)),
  );
  const done = avance >= 100;
  const { error } = await supabase
    .from("ted_plan_tareas" as never)
    .update({
      descripcion: text,
      checklist: stamped,
      sync_avance_checklist: sync,
      avance,
      completada: done,
      completada_at: done ? now : null,
      completada_by: done ? user_id : null,
    } as never)
    .eq("id", input.id);
  if (error) {
    console.error("[planificacion] progreso:", error);
    return { ok: false, error: "No se pudo guardar el avance." };
  }
  if (done) {
    await sync_ticket_on_tarea_done(supabase, input.id, user_id, "");
  }
  revalidate_plan();
  return { ok: true, avance };
}

export async function place_plan_tarea_trimestre(
  tarea_id: number,
  trimestre: PlanTrimestre | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(tarea_id) || tarea_id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  if (trimestre && !PLAN_TRIMESTRES.includes(trimestre)) {
    return { ok: false, error: "Trimestre inválido." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_tareas" as never)
    .update({ trimestre } as never)
    .eq("id", tarea_id);
  if (error) {
    console.error("[planificacion] place trimestre:", error);
    const missing = /trimestre|PGRST204|schema cache/i.test(error.message ?? "");
    return {
      ok: false,
      error: missing
        ? "Falta la columna trimestre en la base. Aplica la migración ted_plan_tarea_trimestre_asignado."
        : "No se pudo colocar el trimestre.",
    };
  }
  revalidate_plan();
  return { ok: true };
}

async function replace_tarea_asignados(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  tarea_id: number,
  usuario_ids: number[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = [...new Set(usuario_ids)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  const { error: del_error } = await supabase
    .from("ted_plan_tarea_asignados" as never)
    .delete()
    .eq("tarea_id", tarea_id);
  if (del_error) {
    console.error("[planificacion] clear asignados:", del_error);
    return { ok: false, error: "No se pudieron actualizar los asignados." };
  }
  if (ids.length === 0) return { ok: true };
  const { error: ins_error } = await supabase
    .from("ted_plan_tarea_asignados" as never)
    .insert(
      ids.map((usuario_id) => ({ tarea_id, usuario_id })) as never,
    );
  if (ins_error) {
    console.error("[planificacion] insert asignados:", ins_error);
    return { ok: false, error: "No se pudieron guardar los asignados." };
  }
  return { ok: true };
}

export async function assign_plan_tareas(
  tarea_ids: number[],
  asignado_ids: number[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ids = [...new Set(tarea_ids)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  if (ids.length === 0) {
    return { ok: false, error: "Selecciona al menos una tarea." };
  }
  if (ids.length > 200) {
    return { ok: false, error: "Demasiadas tareas de una vez." };
  }
  const people = [...new Set(asignado_ids)].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  if (people.length > 0) {
    const { data: rows, error: person_error } = await gate.ctx.supabase
      .from("usuarios")
      .select("id, departamento")
      .in("id", people);
    if (person_error || !rows || rows.length !== people.length) {
      return { ok: false, error: "No se encontró a alguna persona." };
    }
    const invalid = (
      rows as Array<{ id: number; departamento: number | null }>
    ).some((row) => Number(row.departamento) !== TED_DEPARTMENT_ID);
    if (invalid) {
      return { ok: false, error: "Solo se puede asignar a miembros TED." };
    }
  }
  const { data, error } = await gate.ctx.supabase
    .from("ted_plan_tareas" as never)
    .update({ asignado_id: people[0] ?? null } as never)
    .in("id", ids)
    .select("id");
  if (error) {
    console.error("[planificacion] assign tareas:", error);
    return { ok: false, error: "No se pudieron asignar las tareas." };
  }
  if ((data ?? []).length === 0) {
    return { ok: false, error: "Ninguna tarea se actualizó. Revisa la selección." };
  }
  for (const row of data as Array<{ id: number }>) {
    const assigned = await replace_tarea_asignados(
      gate.ctx.supabase,
      row.id,
      people,
    );
    if (!assigned.ok) return assigned;
  }
  revalidate_plan();
  return { ok: true, count: (data ?? []).length };
}
