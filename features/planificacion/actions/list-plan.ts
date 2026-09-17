"use server";

import { getAllUsersAdmin } from "@/actions/admin-users";
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
};

async function sync_shell_apps(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
) {
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
  if (to_insert.length > 0) {
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
    }
  }
  for (const app of catalog) {
    const row = existing.get(app.slug);
    if (row && row.origen === "shell") {
      await supabase
        .from("ted_plan_apps" as never)
        .update({ nombre: app.nombre, subtitulo: app.subtitulo } as never)
        .eq("id", row.id);
    }
  }
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

export async function load_plan_workspace(): Promise<
  { ok: true; data: PlanWorkspaceData } | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;
  await sync_shell_apps(supabase);

  const [apps_res, modulos_res, tareas_res, parts, hitos_res, users_result, links_res] =
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
        "id, modulo_id, titulo, origen, avance, no_solicitada, completada, completada_at, entregable_tipo, entregable_ruta, entregable_unidad, entregable_version, entregable_comentario, fecha_inicio, fecha_fin, orden",
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
    getAllUsersAdmin(),
    supabase
      .from("ted_plan_modulo_apps" as never)
      .select("modulo_id, app_id"),
  ]);

  let tareas = tareas_res;
  if (
    tareas.error &&
    /fecha_inicio|fecha_fin|avance|no_solicitada|orden/.test(tareas.error.message ?? "")
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

  const users = (users_result.data ?? []).filter((u) => u.esta_activo !== false);
  const name_by_id = new Map(users.map((u) => [u.id, u.nombre_apellido]));
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
    list.push({
      ...row,
      avance: tarea_avance(row),
      no_solicitada: is_tarea_no_solicitada(row),
      fecha_inicio: row.fecha_inicio ?? null,
      fecha_fin: row.fecha_fin ?? null,
      orden: row.orden ?? row.id,
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
    built.participantes = participantes_by_mod.get(row.id) ?? [];
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
        modulos: app_modulos,
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
      usuarios: users.map((u) => ({
        id: u.id,
        label: u.nombre_apellido,
      })),
    },
  };
}
