"use server";

import { cache } from "react";
import { TED_DEPARTMENT_ID } from "../lib/ted-department";
import { require_ted_plan_context } from "./assert-ted";
import { user_initials } from "../lib/display";
import { derive_app_salud, sum_app_progress } from "../lib/app-salud";
import {
  average_avance,
  is_tarea_done,
  is_tarea_no_solicitada,
  is_tarea_pending,
  tarea_avance,
} from "../lib/task-progress";
import { createAdminClient } from "@/lib/supabase/server";
import { iso_date } from "../lib/task-dates";
import { unique_people } from "../lib/people";
import { sort_modulos_general_first } from "../lib/sort-tareas";
import {
  as_plan_workspace_data,
  is_public_snapshot_token,
} from "../lib/public-plan-snapshot";
import {
  list_shell_plan_apps,
  plan_app_sort_index,
  resolve_plan_app_section,
} from "../lib/shell-plan-apps";
import type {
  PlanApp,
  PlanAppOrigen,
  PlanHito,
  PlanHitoIcono,
  PlanModulo,
  PlanOrigen,
  PlanParticipante,
  PlanSalud,
  PlanTarea,
  PlanTrimestre,
  PlanWorkspaceData,
  EntregableTipo,
} from "../lib/types";

type AppRow = {
  id: number;
  slug: string;
  nombre: string;
  subtitulo: string | null;
  origen: PlanAppOrigen;
  archived_at: string | null;
};

type ModuloRow = {
  id: number;
  app_id: number | null;
  nombre: string;
  subtitulo: string | null;
  trimestre_entrega: PlanTrimestre;
  anio: number;
  fecha_objetivo: string | null;
  salud_override: PlanSalud | null;
};

type TareaRow = {
  id: number;
  modulo_id: number;
  titulo: string;
  origen: PlanOrigen;
  avance: number | null;
  no_solicitada?: boolean | null;
  completada: boolean;
  completada_at: string | null;
  entregable_tipo: EntregableTipo;
  entregable_ruta: string | null;
  entregable_unidad: string | null;
  entregable_version: string | null;
  entregable_comentario: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden?: number | null;
  trimestre?: PlanTrimestre | null;
  asignado_id?: number | null;
  en_planificacion?: boolean | null;
  ticket_id?: number | null;
};

let shell_apps_synced = false;

async function sync_shell_apps(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
) {
  if (shell_apps_synced) return;
  const catalog = list_shell_plan_apps();
  const { data, error } = await supabase
    .from("ted_plan_apps" as never)
    .select("id, slug, origen");
  if (error) {
    console.error("[planificacion] load apps:", error);
    return;
  }
  const existing = new Map(
    ((data ?? []) as Array<{ id: number; slug: string; origen: string }>).map(
      (row) => [row.slug, row],
    ),
  );
  const to_insert = catalog.filter((app) => !existing.has(app.slug));
  if (to_insert.length === 0) {
    shell_apps_synced = true;
    return;
  }
  const { error: ins_error } = await supabase
    .from("ted_plan_apps" as never)
    .insert(
      to_insert.map((app) => ({
        slug: app.slug,
        nombre: app.nombre,
        subtitulo: app.subtitulo,
        origen: "shell",
      })) as never,
    );
  if (ins_error) {
    console.error("[planificacion] seed apps:", ins_error);
    return;
  }
  shell_apps_synced = true;
}

function module_metrics(tareas: PlanTarea[], modulo: ModuloRow): PlanModulo {
  const done_count = tareas.filter((t) => is_tarea_done(t)).length;
  const left_count = tareas.filter((t) => is_tarea_pending(t)).length;
  const progress = average_avance(tareas);
  let salud: PlanSalud = modulo.salud_override ?? "Planificado";
  if (!modulo.salud_override) {
    if (done_count + left_count === 0) salud = "Planificado";
    else if (left_count === 0) salud = "Completado";
    else {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Caracas",
      }).format(new Date());
      const overdue = tareas.some((tarea) => {
        const due = iso_date(tarea.fecha_fin ?? tarea.fecha_inicio);
        return is_tarea_pending(tarea) && Boolean(due) && due! < today;
      });
      salud = overdue ? "En Riesgo" : "En Marcha";
    }
  }
  return {
    ...modulo,
    app_id: Number(modulo.app_id),
    app_ids: [],
    done_count,
    left_count,
    progress,
    salud,
    participantes: [],
    tareas,
  };
}

async function query_plan_workspace(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<{ ok: true; data: PlanWorkspaceData } | { ok: false; error: string }> {
  const [apps_res, modulos_res, tareas_res, parts, hitos_res, users_result, links_res, asignados_res] =
    await Promise.all([
    supabase
      .from("ted_plan_apps" as never)
      .select("id, slug, nombre, subtitulo, origen, archived_at")
      .is("archived_at", null)
      .order("nombre"),
    supabase
      .from("ted_plan_modulos" as never)
      .select(
        "id, app_id, nombre, subtitulo, trimestre_entrega, anio, fecha_objetivo, salud_override",
      )
      .is("archived_at", null)
      .order("nombre"),
    supabase
      .from("ted_plan_tareas" as never)
      .select(
        "id, modulo_id, titulo, origen, avance, no_solicitada, completada, completada_at, entregable_tipo, entregable_ruta, entregable_unidad, entregable_version, entregable_comentario, fecha_inicio, fecha_fin, orden, trimestre, asignado_id, en_planificacion, ticket_id",
      )
      .order("orden")
      .order("id"),
    supabase
      .from("ted_plan_modulo_participantes" as never)
      .select("modulo_id, usuario_id"),
    supabase
      .from("ted_plan_hitos" as never)
      .select("id, app_id, modulo_id, titulo, descripcion, trimestre, anio, icono")
      .order("id"),
    supabase
      .from("usuarios")
      .select("id, nombre_apellido, esta_activo, departamento")
      .eq("departamento", TED_DEPARTMENT_ID),
    supabase
      .from("ted_plan_modulo_apps" as never)
      .select("modulo_id, app_id"),
    supabase
      .from("ted_plan_tarea_asignados" as never)
      .select("tarea_id, usuario_id"),
  ]);

  let tareas = tareas_res;
  if (
    tareas.error &&
    /fecha_inicio|fecha_fin|avance|no_solicitada|orden|trimestre|asignado_id|en_planificacion/.test(tareas.error.message ?? "")
  ) {
    tareas = await supabase
      .from("ted_plan_tareas" as never)
      .select(
        "id, modulo_id, titulo, origen, completada, completada_at, entregable_tipo, entregable_ruta, entregable_unidad, entregable_version, entregable_comentario",
      )
      .order("id");
  }

  if (apps_res.error) {
    console.error("[planificacion] apps:", apps_res.error);
    return { ok: false, error: "No se pudieron cargar las aplicaciones." };
  }
  if (modulos_res.error) {
    console.error("[planificacion] modulos:", modulos_res.error);
    return { ok: false, error: "No se pudieron cargar los módulos." };
  }
  if (tareas.error) {
    console.error("[planificacion] tareas:", tareas.error);
    return { ok: false, error: "No se pudieron cargar las tareas." };
  }
  if (parts.error) {
    console.error("[planificacion] participantes:", parts.error);
    return { ok: false, error: "No se pudieron cargar los participantes." };
  }
  if (hitos_res.error) {
    console.error("[planificacion] hitos:", hitos_res.error);
    return { ok: false, error: "No se pudieron cargar los hitos." };
  }
  if (links_res.error) {
    console.error("[planificacion] modulo apps:", links_res.error);
    return { ok: false, error: "No se pudieron cargar las apps de cada módulo." };
  }

  if (users_result.error) {
    console.error("[planificacion] usuarios:", users_result.error);
  }
  const user_rows = (users_result.data ?? []) as Array<{
    id: number;
    nombre_apellido: string;
    esta_activo: boolean | null;
    departamento: number | null;
  }>;
  const users = user_rows.filter((u) => u.esta_activo !== false);
  const ted_users = users.filter(
    (u) => Number(u.departamento) === TED_DEPARTMENT_ID,
  );
  const name_by_id = new Map(users.map((u) => [u.id, u.nombre_apellido]));
  function person_of(usuario_id: number): PlanParticipante {
    const nombre = name_by_id.get(usuario_id) ?? "Usuario";
    return {
      usuario_id,
      nombre,
      initials: user_initials(nombre),
    };
  }
  const asignados_by_tarea = new Map<number, PlanParticipante[]>();
  if (asignados_res.error) {
    console.error("[planificacion] asignados:", asignados_res.error);
  }
  for (const row of (asignados_res.data ?? []) as Array<{
    tarea_id: number;
    usuario_id: number;
  }>) {
    const list = asignados_by_tarea.get(row.tarea_id) ?? [];
    list.push(person_of(row.usuario_id));
    asignados_by_tarea.set(row.tarea_id, list);
  }
  const participantes_by_mod = new Map<number, PlanParticipante[]>();
  for (const row of (parts.data ?? []) as Array<{
    modulo_id: number;
    usuario_id: number;
  }>) {
    const nombre = name_by_id.get(row.usuario_id) ?? "Usuario";
    const list = participantes_by_mod.get(row.modulo_id) ?? [];
    list.push({
      usuario_id: row.usuario_id,
      nombre,
      initials: user_initials(nombre),
    });
    participantes_by_mod.set(row.modulo_id, list);
  }

  const tareas_by_mod = new Map<number, PlanTarea[]>();
  for (const row of (tareas.data ?? []) as TareaRow[]) {
    const list = tareas_by_mod.get(row.modulo_id) ?? [];
    if ((row.en_planificacion as boolean | null | undefined) === false) continue;
    const asignados = unique_people([
      ...(asignados_by_tarea.get(row.id) ?? []),
      ...(row.asignado_id ? [person_of(row.asignado_id)] : []),
    ]);
    list.push({
      ...row,
      avance: tarea_avance(row),
      no_solicitada: is_tarea_no_solicitada(row),
      fecha_inicio: row.fecha_inicio ?? null,
      fecha_fin: row.fecha_fin ?? null,
      orden: row.orden ?? row.id,
      trimestre: row.trimestre ?? null,
      asignado_id: asignados[0]?.usuario_id ?? row.asignado_id ?? null,
      en_planificacion: row.en_planificacion !== false,
      ticket_id: row.ticket_id ?? null,
      asignados,
      asignado: asignados[0] ?? null,
    });
    tareas_by_mod.set(row.modulo_id, list);
  }
  for (const [modulo_id, list] of tareas_by_mod) {
    list.sort((a, b) => a.orden - b.orden || a.id - b.id);
    tareas_by_mod.set(modulo_id, list);
  }

  const app_ids_by_mod = new Map<number, number[]>();
  for (const row of (links_res.data ?? []) as Array<{
    modulo_id: number;
    app_id: number;
  }>) {
    const list = app_ids_by_mod.get(row.modulo_id) ?? [];
    if (!list.includes(row.app_id)) list.push(row.app_id);
    app_ids_by_mod.set(row.modulo_id, list);
  }

  const modulos_by_app = new Map<number, PlanModulo[]>();
  for (const row of (modulos_res.data ?? []) as ModuloRow[]) {
    const fallback = Number(row.app_id);
    const app_ids =
      app_ids_by_mod.get(row.id) ?? (fallback > 0 ? [fallback] : []);
    if (app_ids.length === 0) continue;
    const built = module_metrics(tareas_by_mod.get(row.id) ?? [], row);
    built.participantes = unique_people([
      ...(participantes_by_mod.get(row.id) ?? []),
      ...(built.tareas.flatMap((tarea) => tarea.asignados)),
    ]);
    built.app_ids = app_ids;
    for (const app_id of app_ids) {
      const list = modulos_by_app.get(app_id) ?? [];
      list.push({ ...built, app_id });
      modulos_by_app.set(app_id, list);
    }
  }

  const hitos_by_app = new Map<number, PlanHito[]>();
  for (const row of (hitos_res.data ?? []) as Array<{
    id: number;
    app_id: number;
    modulo_id: number | null;
    titulo: string;
    descripcion: string | null;
    trimestre: PlanTrimestre;
    anio: number;
    icono: PlanHitoIcono;
  }>) {
    const list = hitos_by_app.get(row.app_id) ?? [];
    list.push(row);
    hitos_by_app.set(row.app_id, list);
  }

  const plan_apps: PlanApp[] = ((apps_res.data ?? []) as AppRow[])
    .map((app) => {
      const app_modulos = modulos_by_app.get(app.id) ?? [];
      const totals = sum_app_progress(app_modulos);
      const section = resolve_plan_app_section(app.slug, app.origen);
      return {
        id: app.id,
        slug: app.slug,
        nombre: app.nombre,
        subtitulo: app.subtitulo,
        origen: app.origen,
        section,
        modulo_count: app_modulos.length,
        modulos: sort_modulos_general_first(app_modulos),
        hitos: hitos_by_app.get(app.id) ?? [],
        ...totals,
        salud: derive_app_salud(app_modulos),
      };
    })
    .sort((a, b) => {
      const ia = plan_app_sort_index(a.slug, a.section);
      const ib = plan_app_sort_index(b.slug, b.section);
      if (ia !== ib) return ia - ib;
      return a.nombre.localeCompare(b.nombre, "es");
    });

  return {
    ok: true,
    data: {
      apps: plan_apps,
      usuarios: ted_users.map((u) => ({
        id: u.id,
        label: u.nombre_apellido,
      })),
    },
  };
}

export const load_plan_workspace = cache(async (): Promise<
  { ok: true; data: PlanWorkspaceData } | { ok: false; error: string }
> => {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;
  await sync_shell_apps(supabase);
  return query_plan_workspace(supabase);
});

export async function load_public_plan_workspace(
  token: string,
): Promise<
  | { ok: true; data: PlanWorkspaceData; captured_at: string }
  | { ok: false; error: string }
> {
  if (!is_public_snapshot_token(token)) {
    return { ok: false, error: "Este enlace no es válido." };
  }
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("ted_plan_public_snapshots" as never)
    .select("payload, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("[planificacion] load snapshot:", error);
    return { ok: false, error: "No se pudo abrir esta foto del plan." };
  }
  if (!data) {
    return { ok: false, error: "Este enlace no existe o ya no está disponible." };
  }
  const row = data as { payload: unknown; created_at: string };
  const payload = as_plan_workspace_data(row.payload);
  if (!payload) {
    return { ok: false, error: "La foto del plan está dañada." };
  }
  return { ok: true, data: payload, captured_at: row.created_at };
}

export async function load_plan_ticket_inbox(): Promise<
  | {
      ok: true;
      items: Array<{
        tarea: PlanTarea;
        app_nombre: string;
        modulo_nombre: string;
      }>;
      usuarios: Array<{ id: number; label: string }>;
    }
  | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;

  const [tareas_res, users_result] = await Promise.all([
    supabase
      .from("ted_plan_tareas" as never)
      .select(
        "id, modulo_id, titulo, origen, avance, no_solicitada, completada, completada_at, entregable_tipo, entregable_ruta, entregable_unidad, entregable_version, entregable_comentario, fecha_inicio, fecha_fin, orden, trimestre, asignado_id, en_planificacion, ticket_id",
      )
      .eq("origen", "TICKET")
      .order("id"),
    supabase
      .from("usuarios")
      .select("id, nombre_apellido, esta_activo, departamento")
      .eq("departamento", TED_DEPARTMENT_ID),
  ]);

  if (tareas_res.error) {
    return { ok: false, error: "No se pudieron cargar las tareas ticket." };
  }

  const rows = (tareas_res.data ?? []) as TareaRow[];
  const modulo_ids = [...new Set(rows.map((row) => row.modulo_id))];
  const tarea_ids = rows.map((row) => row.id);
  const [modulos_res, links_res, asignados_res] =
    modulo_ids.length === 0
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ]
      : await Promise.all([
          supabase
            .from("ted_plan_modulos" as never)
            .select("id, app_id, nombre")
            .in("id", modulo_ids),
          supabase
            .from("ted_plan_modulo_apps" as never)
            .select("modulo_id, app_id")
            .in("modulo_id", modulo_ids),
          tarea_ids.length === 0
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from("ted_plan_tarea_asignados" as never)
                .select("tarea_id, usuario_id")
                .in("tarea_id", tarea_ids),
        ]);

  if (modulos_res.error) {
    return { ok: false, error: "No se pudieron cargar los módulos." };
  }

  const modulo_rows = (modulos_res.data ?? []) as Array<{
    id: number;
    app_id: number | null;
    nombre: string;
  }>;
  const app_ids = new Set<number>();
  const app_ids_by_mod = new Map<number, number[]>();
  for (const row of (links_res.data ?? []) as Array<{
    modulo_id: number;
    app_id: number;
  }>) {
    const list = app_ids_by_mod.get(row.modulo_id) ?? [];
    if (!list.includes(row.app_id)) list.push(row.app_id);
    app_ids_by_mod.set(row.modulo_id, list);
    app_ids.add(row.app_id);
  }
  for (const modulo of modulo_rows) {
    const fallback = Number(modulo.app_id);
    if (fallback > 0) {
      const list = app_ids_by_mod.get(modulo.id) ?? [];
      if (!list.includes(fallback)) list.push(fallback);
      app_ids_by_mod.set(modulo.id, list);
      app_ids.add(fallback);
    }
  }

  const apps_res =
    app_ids.size === 0
      ? { data: [] }
      : await supabase
          .from("ted_plan_apps" as never)
          .select("id, nombre")
          .in("id", [...app_ids]);

  const app_name = new Map(
    ((apps_res.data ?? []) as Array<{ id: number; nombre: string }>).map(
      (app) => [app.id, app.nombre],
    ),
  );
  const modulo_name = new Map(modulo_rows.map((row) => [row.id, row.nombre]));
  const user_rows = (users_result.data ?? []) as Array<{
    id: number;
    nombre_apellido: string;
    esta_activo: boolean | null;
  }>;
  const ted_users = user_rows.filter((u) => u.esta_activo !== false);
  const name_by_id = new Map(ted_users.map((u) => [u.id, u.nombre_apellido]));
  function person_of(usuario_id: number): PlanParticipante {
    const nombre = name_by_id.get(usuario_id) ?? "Usuario";
    return {
      usuario_id,
      nombre,
      initials: user_initials(nombre),
    };
  }
  const asignados_by_tarea = new Map<number, PlanParticipante[]>();
  for (const row of (asignados_res.data ?? []) as Array<{
    tarea_id: number;
    usuario_id: number;
  }>) {
    const list = asignados_by_tarea.get(row.tarea_id) ?? [];
    list.push(person_of(row.usuario_id));
    asignados_by_tarea.set(row.tarea_id, list);
  }

  const items = rows.map((row) => {
    const ids = app_ids_by_mod.get(row.modulo_id) ?? [];
    const app_nombre =
      ids
        .map((id) => app_name.get(id))
        .filter(Boolean)
        .join(" · ") || "Prisma";
    const asignados = unique_people([
      ...(asignados_by_tarea.get(row.id) ?? []),
      ...(row.asignado_id ? [person_of(row.asignado_id)] : []),
    ]);
    const tarea: PlanTarea = {
      ...row,
      avance: tarea_avance(row),
      no_solicitada: is_tarea_no_solicitada(row),
      fecha_inicio: row.fecha_inicio ?? null,
      fecha_fin: row.fecha_fin ?? null,
      orden: row.orden ?? row.id,
      trimestre: row.trimestre ?? null,
      asignado_id: asignados[0]?.usuario_id ?? row.asignado_id ?? null,
      en_planificacion: row.en_planificacion !== false,
      ticket_id: row.ticket_id ?? null,
      asignado: asignados[0] ?? null,
      asignados,
    };
    return {
      tarea,
      app_nombre,
      modulo_nombre: modulo_name.get(row.modulo_id) ?? "Módulo",
    };
  });

  return {
    ok: true,
    items,
    usuarios: ted_users.map((u) => ({
      id: u.id,
      label: u.nombre_apellido,
    })),
  };
}
