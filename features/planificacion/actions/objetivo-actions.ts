"use server";

import { revalidatePath } from "next/cache";
import { objetivo_schema, type ObjetivoInput } from "../schemas";
import { require_objetivos_read_context, require_objetivos_write_context, require_ted_plan_context } from "./assert-ted";
import { month_bounds, parse_plan_month, ranges_overlap } from "../lib/plan-month";
import { average_avance, is_tarea_pending, is_tarea_no_solicitada, tarea_avance } from "../lib/task-progress";
import { user_initials } from "../lib/display";
import { unique_people } from "../lib/people";
import type {
  PlanApp,
  PlanObjetivo,
  PlanObjetivoEstado,
  PlanOrigen,
  PlanParticipante,
  PlanTarea,
  PlanUsuarioOption,
  EntregableTipo,
  PlanTrimestre,
} from "../lib/types";

function revalidate_objetivos() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/informe");
}

type ObjetivoRow = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  app_id: number | null;
  estado: PlanObjetivoEstado;
};

type CoverTareaRow = {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion?: string | null;
  origen: PlanOrigen;
  avance: number | null;
  no_solicitada?: boolean | null;
  completada: boolean;
  completada_at: string | null;
  created_at: string | null;
  updated_at?: string | null;
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
  objetivo_id?: number | null;
};

function as_plan_tarea(
  row: CoverTareaRow,
  objetivo_titulo: string | null,
  asignados: PlanParticipante[],
): PlanTarea {
  return {
    ...row,
    descripcion: row.descripcion ?? null,
    avance: tarea_avance(row),
    no_solicitada: is_tarea_no_solicitada(row),
    fecha_inicio: row.fecha_inicio ?? null,
    fecha_fin: row.fecha_fin ?? null,
    orden: row.orden ?? row.id,
    trimestre: row.trimestre ?? null,
    asignado_id: asignados[0]?.usuario_id ?? row.asignado_id ?? null,
    en_planificacion: row.en_planificacion !== false,
    ticket_id: row.ticket_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    objetivo_id: row.objetivo_id ?? null,
    objetivo_titulo,
    asignados,
    asignado: asignados[0] ?? null,
  };
}

export type PlanObjetivoCover = PlanObjetivo & { tareas: PlanTarea[] };

export type CubrirWorkspace = {
  mes: string;
  objetivos: PlanObjetivoCover[];
  sueltas: PlanTarea[];
  apps: Array<{ id: number; nombre: string }>;
  plan_apps: PlanApp[];
  usuarios: PlanUsuarioOption[];
};

export async function save_plan_objetivo(
  raw: ObjetivoInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = objetivo_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;
  const payload = {
    titulo: input.titulo,
    descripcion: input.descripcion || null,
    fecha_inicio: input.fecha_inicio,
    fecha_fin: input.fecha_fin,
    app_id: input.app_id ?? null,
    estado: input.estado ?? "abierto",
  };

  if (input.id && input.id > 0) {
    const { error } = await supabase
      .from("ted_plan_objetivos" as never)
      .update(payload as never)
      .eq("id", input.id);
    if (error) {
      console.error("[planificacion] update objetivo:", error);
      return { ok: false, error: "No se pudo actualizar el objetivo." };
    }
    revalidate_objetivos();
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from("ted_plan_objetivos" as never)
    .insert({ ...payload, created_by: user_id } as never)
    .select("id")
    .single();
  if (error || !data) {
    console.error("[planificacion] insert objetivo:", error);
    return { ok: false, error: "No se pudo crear el objetivo." };
  }
  revalidate_objetivos();
  return { ok: true, id: Number((data as { id: number }).id) };
}

export async function delete_plan_objetivo(
  objetivo_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(objetivo_id) || objetivo_id <= 0) {
    return { ok: false, error: "Objetivo inválido." };
  }
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_objetivos" as never)
    .delete()
    .eq("id", objetivo_id);
  if (error) {
    console.error("[planificacion] delete objetivo:", error);
    return { ok: false, error: "No se pudo eliminar el objetivo." };
  }
  revalidate_objetivos();
  return { ok: true };
}

export async function vincular_tarea_objetivo(
  tarea_id: number,
  objetivo_id: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(tarea_id) || tarea_id <= 0) {
    return { ok: false, error: "Tarea inválida." };
  }
  if (objetivo_id !== null && (!Number.isInteger(objetivo_id) || objetivo_id <= 0)) {
    return { ok: false, error: "Objetivo inválido." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { error } = await gate.ctx.supabase
    .from("ted_plan_tareas" as never)
    .update({ objetivo_id } as never)
    .eq("id", tarea_id);
  if (error) {
    console.error("[planificacion] vincular objetivo:", error);
    return { ok: false, error: "No se pudo vincular la tarea." };
  }
  revalidate_objetivos();
  return { ok: true };
}

export async function search_tareas_para_vincular(
  query: string,
  exclude_objetivo_id?: number,
): Promise<{ ok: true; items: Array<{ id: number; titulo: string; origen: PlanOrigen; objetivo_id: number | null }> } | { ok: false; error: string }> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const q = query.trim();
  if (q.length < 2) return { ok: true, items: [] };
  const { data, error } = await gate.ctx.supabase
    .from("ted_plan_tareas" as never)
    .select("id, titulo, origen, objetivo_id, en_planificacion")
    .ilike("titulo", `%${q}%`)
    .order("id", { ascending: false })
    .limit(25);
  if (error) {
    console.error("[planificacion] search tareas:", error);
    return { ok: false, error: "No se pudo buscar." };
  }
  const items = (
    (data ?? []) as Array<{
      id: number;
      titulo: string;
      origen: PlanOrigen;
      objetivo_id: number | null;
      en_planificacion: boolean | null;
    }>
  )
    .filter((row) => row.en_planificacion !== false)
    .filter((row) => row.objetivo_id !== exclude_objetivo_id)
    .map((row) => ({
      id: row.id,
      titulo: row.titulo,
      origen: row.origen,
      objetivo_id: row.objetivo_id,
    }));
  return { ok: true, items };
}

export async function load_objetivos_month(
  mes: string,
): Promise<
  | {
      ok: true;
      mes: string;
      objetivos: PlanObjetivo[];
      apps: Array<{ id: number; nombre: string }>;
    }
  | { ok: false; error: string }
> {
  const cover = await load_cubrir_workspace(mes);
  if (!cover.ok) return cover;
  return {
    ok: true,
    mes: cover.data.mes,
    objetivos: cover.data.objetivos,
    apps: cover.data.apps,
  };
}

export async function load_cubrir_workspace(
  mes_raw: string,
): Promise<{ ok: true; data: CubrirWorkspace } | { ok: false; error: string }> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const { query_plan_workspace } = await import("./list-plan");
  const plan = await query_plan_workspace(gate.ctx.supabase);
  if (!plan.ok) return plan;

  const mes = parse_plan_month(mes_raw);
  const { start, end } = month_bounds(mes);
  const { supabase } = gate.ctx;

  const [obj_res, apps_res, tareas_res, asignados_res] = await Promise.all([
    supabase
      .from("ted_plan_objetivos" as never)
      .select("id, titulo, descripcion, fecha_inicio, fecha_fin, app_id, estado")
      .lte("fecha_inicio", end)
      .gte("fecha_fin", start)
      .order("fecha_inicio")
      .order("id"),
    supabase
      .from("ted_plan_apps" as never)
      .select("id, nombre")
      .is("archived_at", null)
      .order("nombre"),
    supabase
      .from("ted_plan_tareas" as never)
      .select(
        "id, modulo_id, titulo, descripcion, origen, avance, no_solicitada, completada, completada_at, created_at, updated_at, entregable_tipo, entregable_ruta, entregable_unidad, entregable_version, entregable_comentario, fecha_inicio, fecha_fin, orden, trimestre, asignado_id, en_planificacion, ticket_id, objetivo_id",
      )
      .order("orden")
      .order("id"),
    supabase.from("ted_plan_tarea_asignados" as never).select("tarea_id, usuario_id"),
  ]);

  if (obj_res.error) {
    console.error("[planificacion] list objetivos:", obj_res.error);
    return { ok: false, error: "No se pudieron cargar los objetivos." };
  }
  if (tareas_res.error) {
    console.error("[planificacion] cubrir tareas:", tareas_res.error);
    return { ok: false, error: "No se pudieron cargar las tareas." };
  }

  const app_name = new Map(
    ((apps_res.data ?? []) as Array<{ id: number; nombre: string }>).map((row) => [
      row.id,
      row.nombre,
    ]),
  );
  const name_by_id = new Map(
    plan.data.usuarios.map((user) => [user.id, user.label]),
  );
  function person_of(usuario_id: number): PlanParticipante {
    const nombre = name_by_id.get(usuario_id) ?? "Usuario";
    return { usuario_id, nombre, initials: user_initials(nombre) };
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

  const obj_rows = (obj_res.data ?? []) as ObjetivoRow[];
  const obj_by_id = new Map(obj_rows.map((row) => [row.id, row]));
  const tareas_by_obj = new Map<number, PlanTarea[]>();
  const sueltas: PlanTarea[] = [];

  for (const row of (tareas_res.data ?? []) as CoverTareaRow[]) {
    if (row.en_planificacion === false) continue;
    const asignados = unique_people([
      ...(asignados_by_tarea.get(row.id) ?? []),
      ...(row.asignado_id ? [person_of(row.asignado_id)] : []),
    ]);
    const titulo = row.objetivo_id
      ? (obj_by_id.get(row.objetivo_id)?.titulo ?? null)
      : null;
    const tarea = as_plan_tarea(row, titulo, asignados);
    if (row.objetivo_id && obj_by_id.has(row.objetivo_id)) {
      const list = tareas_by_obj.get(row.objetivo_id) ?? [];
      list.push(tarea);
      tareas_by_obj.set(row.objetivo_id, list);
      continue;
    }
    if (row.objetivo_id) continue;
    if (!is_tarea_pending(tarea)) continue;
    const in_dates = ranges_overlap(
      tarea.fecha_inicio,
      tarea.fecha_fin,
      start,
      end,
    );
    const created = (tarea.created_at ?? "").slice(0, 10);
    const in_created = created >= start && created <= end;
    if (in_dates || in_created) sueltas.push(tarea);
  }

  const objetivos: PlanObjetivoCover[] = obj_rows.map((row) => {
    const tareas = tareas_by_obj.get(row.id) ?? [];
    return {
      id: row.id,
      titulo: row.titulo,
      descripcion: row.descripcion,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      app_id: row.app_id,
      app_nombre: row.app_id ? (app_name.get(row.app_id) ?? null) : null,
      estado: row.estado,
      tarea_count: tareas.length,
      avance: average_avance(tareas),
      tareas,
    };
  });

  return {
    ok: true,
    data: {
      mes,
      objetivos,
      sueltas,
      apps: (apps_res.data ?? []) as Array<{ id: number; nombre: string }>,
      plan_apps: plan.data.apps,
      usuarios: plan.data.usuarios,
    },
  };
}
