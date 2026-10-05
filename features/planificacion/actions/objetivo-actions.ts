"use server";

import { revalidatePath } from "next/cache";
import { objetivo_schema, type ObjetivoInput } from "../schemas";
import { require_objetivos_read_context, require_objetivos_write_context, require_ted_plan_context } from "./assert-ted";
import { month_bounds, parse_plan_month, ranges_overlap } from "../lib/plan-month";
import { average_avance, is_tarea_pending } from "../lib/task-progress";
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
} from "../lib/types";
import { is_plan_mes_emitido, type PlanMes } from "../lib/plan-mes";
import { ensure_plan_mes, fetch_plan_mes } from "../lib/plan-mes-db";
import { list_objetivo_solicitantes } from "../lib/objetivo-solicitantes";

function revalidate_objetivos() {
  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/tareas");
  revalidatePath("/ted/planificacion/objetivos");
  revalidatePath("/ted/planificacion/informe");
  revalidatePath("/ted/planificacion/cubrir");
}

async function replace_objetivo_apps(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createAdminClient>>,
  objetivo_id: number,
  app_ids: number[],
) {
  const { error: del_err } = await supabase
    .from("ted_plan_objetivo_apps" as never)
    .delete()
    .eq("objetivo_id", objetivo_id);
  if (del_err) return del_err;
  if (app_ids.length === 0) return null;
  const { error } = await supabase.from("ted_plan_objetivo_apps" as never).insert(
    app_ids.map((app_id) => ({ objetivo_id, app_id })) as never,
  );
  return error;
}

type ObjetivoRow = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  app_id: number | null;
  estado: PlanObjetivoEstado;
  created_by: number | null;
  solicitado_por: number | null;
};

export type PlanObjetivoCover = PlanObjetivo & { tareas: PlanTarea[] };

export type CubrirWorkspace = {
  mes: string;
  plan_mes: PlanMes;
  unpublished_hidden: boolean;
  current_user_id: number | null;
  objetivos: PlanObjetivoCover[];
  sueltas: PlanTarea[];
  apps: Array<{ id: number; nombre: string }>;
  plan_apps: PlanApp[];
  usuarios: PlanUsuarioOption[];
};

function sorted_ids(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

function same_id_list(a: number[], b: number[]): boolean {
  const left = sorted_ids(a);
  const right = sorted_ids(b);
  return left.length === right.length && left.every((id, i) => id === right[i]);
}

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
  const bounds = month_bounds(input.mes);
  const app_ids = [...new Set(input.app_ids ?? [])];
  const solicitado_por =
    input.solicitado_por && input.solicitado_por > 0
      ? input.solicitado_por
      : user_id;
  const payload = {
    titulo: input.titulo,
    descripcion: input.descripcion || null,
    fecha_inicio: bounds.start,
    fecha_fin: bounds.end,
    app_id: app_ids[0] ?? null,
    estado: input.estado ?? "abierto",
    solicitado_por,
  };

  const mes = parse_plan_month(input.mes);
  await ensure_plan_mes(supabase, mes);
  const plan_before = await fetch_plan_mes(supabase, mes);

  if (input.id && input.id > 0) {
    const { data: prev } = await supabase
      .from("ted_plan_objetivos" as never)
      .select("id, titulo, descripcion, estado, app_id, solicitado_por")
      .eq("id", input.id)
      .maybeSingle();
    const prev_row = prev as {
      titulo?: string;
      descripcion?: string | null;
      estado?: PlanObjetivoEstado;
      app_id?: number | null;
      solicitado_por?: number | null;
    } | null;
    const { data: prev_links } = await supabase
      .from("ted_plan_objetivo_apps" as never)
      .select("app_id")
      .eq("objetivo_id", input.id);
    const prev_app_ids = [
      ...new Set(
        ((prev_links ?? []) as Array<{ app_id: number }>).map((link) => link.app_id),
      ),
    ];
    if (prev_app_ids.length === 0 && prev_row?.app_id) {
      prev_app_ids.push(prev_row.app_id);
    }

    const { error } = await supabase
      .from("ted_plan_objetivos" as never)
      .update(payload as never)
      .eq("id", input.id);
    if (error) {
      console.error("[planificacion] update objetivo:", error);
      return { ok: false, error: "No se pudo actualizar el objetivo." };
    }
    const links = await replace_objetivo_apps(supabase, input.id, app_ids);
    if (links) {
      console.error("[planificacion] objetivo apps:", links);
      return { ok: false, error: "No se pudieron guardar las apps del objetivo." };
    }
    const changed =
      (prev_row?.titulo ?? "") !== payload.titulo ||
      (prev_row?.descripcion ?? null) !== payload.descripcion ||
      (prev_row?.estado ?? "abierto") !== payload.estado ||
      (prev_row?.solicitado_por ?? null) !== (payload.solicitado_por ?? null) ||
      !same_id_list(prev_app_ids, app_ids);
    if (changed) {
      console.log("[plan-mes] save objetivo", {
        mes,
        estado: plan_before.estado,
        version: plan_before.version,
        changed,
        emitido: is_plan_mes_emitido(plan_before),
        notify: false,
      });
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
  const id = Number((data as { id: number }).id);
  const links = await replace_objetivo_apps(supabase, id, app_ids);
  if (links) {
    console.error("[planificacion] objetivo apps:", links);
    return { ok: false, error: "No se pudieron guardar las apps del objetivo." };
  }
  revalidate_objetivos();
  return { ok: true, id };
}

export async function delete_plan_objetivo(
  objetivo_id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(objetivo_id) || objetivo_id <= 0) {
    return { ok: false, error: "Objetivo inválido." };
  }
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;
  const { error } = await supabase
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
      plan_mes: PlanMes;
      objetivos: PlanObjetivo[];
      apps: Array<{ id: number; nombre: string; slug: string }>;
      usuarios: PlanUsuarioOption[];
    }
  | { ok: false; error: string }
> {
  const cover = await load_cubrir_workspace(mes, { unpublished_objetivos: "include" });
  if (!cover.ok) return cover;
  const gate = await require_objetivos_read_context();
  const usuarios = gate.ok
    ? await list_objetivo_solicitantes(gate.ctx.supabase)
    : [];
  return {
    ok: true,
    mes: cover.data.mes,
    plan_mes: cover.data.plan_mes,
    objetivos: cover.data.objetivos,
    apps: cover.data.plan_apps.map((app) => ({
      id: app.id,
      nombre: app.nombre,
      slug: app.slug,
    })),
    usuarios,
  };
}

export async function load_cubrir_workspace(
  mes_raw: string,
  opts?: { unpublished_objetivos?: "include" | "hide" },
): Promise<{ ok: true; data: CubrirWorkspace } | { ok: false; error: string }> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const { query_plan_workspace, sync_shell_apps } = await import("./list-plan");
  await sync_shell_apps(gate.ctx.supabase);
  const plan = await query_plan_workspace(gate.ctx.supabase);
  if (!plan.ok) return plan;

  const mes = parse_plan_month(mes_raw);
  const { start, end } = month_bounds(mes);
  const { supabase, user_id } = gate.ctx;

  const [obj_res, apps_res, responsables_res] =
    await Promise.all([
    supabase
      .from("ted_plan_objetivos" as never)
      .select("id, titulo, descripcion, fecha_inicio, fecha_fin, app_id, estado, created_by, solicitado_por")
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
      .from("ted_plan_objetivo_responsables" as never)
      .select("objetivo_id, usuario_id"),
  ]);

  if (obj_res.error) {
    console.error("[planificacion] list objetivos:", obj_res.error);
    return { ok: false, error: "No se pudieron cargar los objetivos." };
  }
  if (responsables_res.error) {
    console.error("[planificacion] responsables:", responsables_res.error);
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

  const obj_rows = (obj_res.data ?? []) as ObjetivoRow[];
  const creator_ids = [
    ...new Set(
      [
        ...obj_rows.flatMap((row) => [row.created_by, row.solicitado_por]),
        ...((responsables_res.data ?? []) as Array<{ usuario_id: number }>).map(
          (row) => row.usuario_id,
        ),
      ].filter((id): id is number => Boolean(id)),
    ),
  ];
  const missing_creators = creator_ids.filter((id) => !name_by_id.has(id));
  if (missing_creators.length > 0) {
    const { data: creators } = await supabase
      .from("usuarios")
      .select("id, nombre_apellido")
      .in("id", missing_creators);
    for (const user of (creators ?? []) as Array<{
      id: number;
      nombre_apellido: string;
    }>) {
      name_by_id.set(user.id, user.nombre_apellido);
    }
  }
  const responsables_by_obj = new Map<number, PlanParticipante[]>();
  for (const row of (responsables_res.data ?? []) as Array<{
    objetivo_id: number;
    usuario_id: number;
  }>) {
    const list = responsables_by_obj.get(row.objetivo_id) ?? [];
    list.push(person_of(row.usuario_id));
    responsables_by_obj.set(row.objetivo_id, list);
  }
  const obj_by_id = new Map(obj_rows.map((row) => [row.id, row]));
  const apps_by_obj = new Map<number, number[]>();
  if (obj_rows.length > 0) {
    const { data: link_rows } = await supabase
      .from("ted_plan_objetivo_apps" as never)
      .select("objetivo_id, app_id")
      .in(
        "objetivo_id",
        obj_rows.map((row) => row.id),
      );
    for (const link of (link_rows ?? []) as Array<{
      objetivo_id: number;
      app_id: number;
    }>) {
      const list = apps_by_obj.get(link.objetivo_id) ?? [];
      if (!list.includes(link.app_id)) list.push(link.app_id);
      apps_by_obj.set(link.objetivo_id, list);
    }
  }
  const tareas_by_obj = new Map<number, PlanTarea[]>();
  const sueltas: PlanTarea[] = [];
  const seen = new Set<number>();
  const plan_tareas: PlanTarea[] = [];
  for (const app of plan.data.apps) {
    for (const modulo of app.modulos) {
      for (const tarea of modulo.tareas) {
        if (seen.has(tarea.id)) continue;
        seen.add(tarea.id);
        plan_tareas.push(tarea);
      }
    }
  }

  for (const tarea of plan_tareas) {
    if (tarea.en_planificacion === false) continue;
    if (tarea.objetivo_id && obj_by_id.has(tarea.objetivo_id)) {
      const list = tareas_by_obj.get(tarea.objetivo_id) ?? [];
      list.push({
        ...tarea,
        objetivo_titulo: obj_by_id.get(tarea.objetivo_id)?.titulo ?? null,
      });
      tareas_by_obj.set(tarea.objetivo_id, list);
      continue;
    }
    if (tarea.objetivo_id) continue;
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
    const app_ids =
      apps_by_obj.get(row.id) ?? (row.app_id ? [row.app_id] : []);
    const names = app_ids
      .map((app_id) => app_name.get(app_id))
      .filter((name): name is string => Boolean(name));
    const solicitado_id = row.solicitado_por ?? row.created_by;
    const responsables = unique_people(responsables_by_obj.get(row.id) ?? []);
    return {
      id: row.id,
      titulo: row.titulo,
      descripcion: row.descripcion,
      fecha_inicio: row.fecha_inicio,
      fecha_fin: row.fecha_fin,
      app_id: app_ids[0] ?? null,
      app_ids,
      app_nombre: names.length > 0 ? names.join(" · ") : null,
      creado_por: row.created_by ? person_of(row.created_by) : null,
      solicitado_por: solicitado_id ? person_of(solicitado_id) : null,
      responsables,
      para_mi: user_id != null && responsables.some((p) => p.usuario_id === user_id),
      estado: row.estado,
      tarea_count: tareas.length,
      avance: average_avance(tareas),
      tareas,
    };
  });

  const plan_mes = await fetch_plan_mes(supabase, mes);
  const hide_unpublished =
    opts?.unpublished_objetivos === "hide" && !is_plan_mes_emitido(plan_mes);

  return {
    ok: true,
    data: {
      mes,
      plan_mes,
      unpublished_hidden: hide_unpublished,
      current_user_id: user_id,
      objetivos: hide_unpublished ? [] : objetivos,
      sueltas,
      apps: (apps_res.data ?? []) as Array<{ id: number; nombre: string }>,
      plan_apps: plan.data.apps,
      usuarios: plan.data.usuarios,
    },
  };
}

export type ObjetivoFormRecord = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  app_id: number | null;
  app_ids: number[];
  estado: PlanObjetivoEstado;
  solicitado_por: number | null;
};

export async function load_objetivo_form(id: number | null): Promise<
  | {
      ok: true;
      apps: Array<{ id: number; nombre: string; slug: string }>;
      usuarios: PlanUsuarioOption[];
      objetivo: ObjetivoFormRecord | null;
    }
  | { ok: false; error: string }
> {
  const gate = await require_objetivos_write_context();
  if (!gate.ok) return gate;
  const { sync_shell_apps } = await import("./list-plan");
  await sync_shell_apps(gate.ctx.supabase);
  const { supabase } = gate.ctx;

  const [apps_res, usuarios] = await Promise.all([
    supabase
      .from("ted_plan_apps" as never)
      .select("id, nombre, slug")
      .is("archived_at", null)
      .order("nombre"),
    list_objetivo_solicitantes(supabase),
  ]);
  if (apps_res.error) {
    console.error("[planificacion] form apps:", apps_res.error);
    return { ok: false, error: "No se pudieron cargar las apps." };
  }

  const catalog = (apps_res.data ?? []) as Array<{
    id: number;
    nombre: string;
    slug: string;
  }>;

  if (!id) {
    return {
      ok: true,
      apps: catalog,
      usuarios,
      objetivo: null,
    };
  }

  const { data, error } = await supabase
    .from("ted_plan_objetivos" as never)
    .select(
      "id, titulo, descripcion, fecha_inicio, fecha_fin, app_id, estado, solicitado_por",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[planificacion] load objetivo:", error);
    return { ok: false, error: "No se pudo cargar el objetivo." };
  }
  if (!data) {
    return { ok: false, error: "No se encontró el objetivo." };
  }
  const row = data as Omit<ObjetivoFormRecord, "app_ids">;
  const { data: link_rows } = await supabase
    .from("ted_plan_objetivo_apps" as never)
    .select("app_id")
    .eq("objetivo_id", id);
  const app_ids = [
    ...new Set(
      ((link_rows ?? []) as Array<{ app_id: number }>).map((link) => link.app_id),
    ),
  ];
  if (app_ids.length === 0 && row.app_id) app_ids.push(row.app_id);
  const extra = row.solicitado_por ? [row.solicitado_por] : [];
  const solicitantes =
    extra.length > 0 && !usuarios.some((user) => user.id === extra[0])
      ? await list_objetivo_solicitantes(supabase, extra)
      : usuarios;
  return {
    ok: true,
    apps: catalog,
    usuarios: solicitantes,
    objetivo: { ...row, app_ids, solicitado_por: row.solicitado_por ?? null },
  };
}
