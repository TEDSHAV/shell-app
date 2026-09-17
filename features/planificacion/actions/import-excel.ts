"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { require_ted_plan_context } from "./assert-ted";
import {
  classify_excel_rows,
  EXCEL_PLAN_MAX_ROWS,
  GENERAL_FALLBACK_MODULO,
  type ExcelExistingTask,
  type ExcelPlanRow,
} from "../lib/excel-plan";
import { excel_commit_schema, type ExcelCommitInput } from "../schemas";
import { normalize_prisma_path } from "../lib/prisma-routes";
import { trimestre_from_iso } from "../lib/task-dates";
import { GENERAL_PLAN_APP } from "../lib/shell-plan-apps";

export type ExcelAppCatalog = {
  id: number;
  nombre: string;
  slug: string;
  modulos: string[];
  items: ExcelExistingTask[];
};

function worksheet_matrix(sheet: ExcelJS.Worksheet): unknown[][] {
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values);
  });
  return matrix;
}

async function load_app_catalog(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<{ ok: true; catalog: ExcelAppCatalog[] } | { ok: false; error: string }> {
  const { data: apps, error: apps_error } = await supabase
    .from("ted_plan_apps" as never)
    .select("id, nombre, slug")
    .is("archived_at", null)
    .order("nombre");
  if (apps_error) {
    return { ok: false, error: "No se pudieron leer las aplicaciones." };
  }
  const app_list = (apps ?? []) as Array<{
    id: number;
    nombre: string;
    slug: string;
  }>;
  const { data: modulos, error: mod_error } = await supabase
    .from("ted_plan_modulos" as never)
    .select("id, app_id, nombre")
    .is("archived_at", null);
  if (mod_error) {
    return { ok: false, error: "No se pudieron leer los módulos." };
  }
  const modulo_list = (modulos ?? []) as Array<{
    id: number;
    app_id: number;
    nombre: string;
  }>;
  const { data: links, error: link_error } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .select("modulo_id, app_id");
  if (link_error) {
    return { ok: false, error: "No se pudieron leer las apps de cada módulo." };
  }
  const { data: tareas, error: tar_error } = await supabase
    .from("ted_plan_tareas" as never)
    .select("titulo, modulo_id");
  if (tar_error) {
    return { ok: false, error: "No se pudieron leer las tareas." };
  }
  const nombre_by_mod = new Map(modulo_list.map((row) => [row.id, row.nombre]));
  const apps_by_mod = new Map<number, number[]>();
  for (const row of (links ?? []) as Array<{ modulo_id: number; app_id: number }>) {
    const list = apps_by_mod.get(row.modulo_id) ?? [];
    if (!list.includes(row.app_id)) list.push(row.app_id);
    apps_by_mod.set(row.modulo_id, list);
  }
  for (const modulo of modulo_list) {
    if (!apps_by_mod.has(modulo.id) && modulo.app_id) {
      apps_by_mod.set(modulo.id, [modulo.app_id]);
    }
  }
  const items_by_app = new Map<number, ExcelExistingTask[]>();
  const mods_by_app = new Map<number, string[]>();
  for (const modulo of modulo_list) {
    for (const app_id of apps_by_mod.get(modulo.id) ?? []) {
      const list = mods_by_app.get(app_id) ?? [];
      list.push(modulo.nombre);
      mods_by_app.set(app_id, list);
    }
  }
  for (const tarea of (tareas ?? []) as Array<{ titulo: string; modulo_id: number }>) {
    for (const app_id of apps_by_mod.get(tarea.modulo_id) ?? []) {
      const list = items_by_app.get(app_id) ?? [];
      list.push({
        modulo: nombre_by_mod.get(tarea.modulo_id) ?? "",
        titulo: tarea.titulo,
      });
      items_by_app.set(app_id, list);
    }
  }
  return {
    ok: true,
    catalog: app_list.map((app) => ({
      id: app.id,
      nombre: app.nombre,
      slug: app.slug,
      modulos: mods_by_app.get(app.id) ?? [],
      items: items_by_app.get(app.id) ?? [],
    })),
  };
}

export async function preview_plan_excel(
  form: FormData,
): Promise<
  | { ok: true; rows: ExcelPlanRow[]; catalog: ExcelAppCatalog[] }
  | { ok: false; error: string }
> {
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const file = form.get("file");
  if (
    !file ||
    typeof file !== "object" ||
    !("arrayBuffer" in file) ||
    typeof (file as Blob).arrayBuffer !== "function" ||
    !("size" in file) ||
    Number((file as Blob).size) <= 0
  ) {
    return { ok: false, error: "Adjunta un archivo .xlsx." };
  }
  const blob = file as Blob;
  if (blob.size > 2_000_000) {
    return { ok: false, error: "El Excel supera 2 MB." };
  }

  const catalog = await load_app_catalog(gate.ctx.supabase);
  if (!catalog.ok) return catalog;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return { ok: false, error: "El libro no tiene hojas." };
    const matrix = worksheet_matrix(sheet);
    if (matrix.length > EXCEL_PLAN_MAX_ROWS + 1) {
      return {
        ok: false,
        error: `El archivo tiene más de ${EXCEL_PLAN_MAX_ROWS} filas.`,
      };
    }
    return {
      ok: true,
      rows: classify_excel_rows(matrix),
      catalog: catalog.catalog,
    };
  } catch (error) {
    console.error("[planificacion] preview excel:", error);
    return { ok: false, error: "No se pudo leer el Excel. Usa .xlsx." };
  }
}

export async function commit_plan_excel(
  raw: ExcelCommitInput,
): Promise<
  | { ok: true; created_modulos: number; created_tareas: number; failed: string[] }
  | { ok: false; error: string }
> {
  const parsed = excel_commit_schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const gate = await require_ted_plan_context();
  if (!gate.ok) return gate;
  const { supabase, user_id } = gate.ctx;
  const input = parsed.data;
  const { data: general_app } = await supabase
    .from("ted_plan_apps" as never)
    .select("id")
    .eq("slug", GENERAL_PLAN_APP.slug)
    .is("archived_at", null)
    .maybeSingle();
  const general_app_id = Number(
    (general_app as { id?: number } | null)?.id ?? 0,
  );
  if (input.rows.some((row) => row.hang_on_general) && general_app_id <= 0) {
    return { ok: false, error: "No está la app General." };
  }
  const rows = input.rows.map((row) =>
    row.hang_on_general && general_app_id > 0
      ? { ...row, app_ids: [general_app_id], hang_on_app_module: false }
      : row,
  );
  const wanted_apps = [...new Set(rows.flatMap((row) => row.app_ids))];
  const { data: app_rows, error: app_error } = await supabase
    .from("ted_plan_apps" as never)
    .select("id")
    .in("id", wanted_apps)
    .is("archived_at", null);
  if (app_error || (app_rows ?? []).length !== wanted_apps.length) {
    return { ok: false, error: "Alguna aplicación no existe." };
  }

  const { data: existing_mods, error: mods_error } = await supabase
    .from("ted_plan_modulos" as never)
    .select("id, nombre, app_id")
    .is("archived_at", null);
  if (mods_error) {
    return { ok: false, error: "No se pudieron leer los módulos." };
  }
  const { data: existing_links } = await supabase
    .from("ted_plan_modulo_apps" as never)
    .select("modulo_id, app_id");
  const linked_apps = new Map<number, number[]>();
  for (const link of (existing_links ?? []) as Array<{
    modulo_id: number;
    app_id: number;
  }>) {
    const list = linked_apps.get(link.modulo_id) ?? [];
    if (!list.includes(link.app_id)) list.push(link.app_id);
    linked_apps.set(link.modulo_id, list);
  }

  const modulo_id_by_name = new Map<string, number>();
  for (const row of (existing_mods ?? []) as Array<{
    id: number;
    nombre: string;
    app_id: number | null;
  }>) {
    const key = row.nombre.trim().toLowerCase();
    if (!modulo_id_by_name.has(key)) modulo_id_by_name.set(key, row.id);
  }

  const named_rows = rows.filter(
    (row) => !row.hang_on_general && !row.hang_on_app_module,
  );
  const hang_rows = rows.filter((row) => row.hang_on_general);
  const app_module_rows = rows.filter((row) => row.hang_on_app_module);
  const apps_by_modulo = new Map<string, number[]>();
  for (const row of named_rows) {
    const key = row.modulo.trim().toLowerCase();
    const list = apps_by_modulo.get(key) ?? [];
    for (const app_id of row.app_ids) {
      if (!list.includes(app_id)) list.push(app_id);
    }
    apps_by_modulo.set(key, list);
  }

  let created_modulos = 0;
  const needed = [...new Set(named_rows.map((row) => row.modulo.trim()))];
  for (const nombre of needed) {
    const key = nombre.toLowerCase();
    const app_ids = apps_by_modulo.get(key) ?? [];
    if (!modulo_id_by_name.has(key)) {
      const starts = named_rows
        .filter((row) => row.modulo.trim().toLowerCase() === key)
        .map((row) => row.fecha_inicio)
        .filter((value): value is string => Boolean(value))
        .sort();
      const first = starts[0] ?? `${input.anio}-01-01`;
      const { data, error } = await supabase
        .from("ted_plan_modulos" as never)
        .insert({
          app_id: app_ids[0],
          nombre,
          trimestre_entrega: trimestre_from_iso(first),
          anio: Number(first.slice(0, 4)) || input.anio,
          created_by: user_id,
        } as never)
        .select("id")
        .single();
      if (error || !data) {
        console.error("[planificacion] import modulo:", error);
        return { ok: false, error: `No se pudo crear el módulo ${nombre}.` };
      }
      modulo_id_by_name.set(key, Number((data as { id: number }).id));
      created_modulos += 1;
    }
    const modulo_id = modulo_id_by_name.get(key);
    if (!modulo_id) continue;
    const { error: link_error } = await supabase
      .from("ted_plan_modulo_apps" as never)
      .upsert(
        app_ids.map((app_id) => ({ modulo_id, app_id })) as never,
        { onConflict: "modulo_id,app_id" },
      );
    if (link_error) {
      console.error("[planificacion] import modulo apps:", link_error);
      return { ok: false, error: `No se pudo vincular ${nombre} a las apps.` };
    }
  }

  const bucket_key = GENERAL_FALLBACK_MODULO.trim().toLowerCase();
  const existing_mod_list = (existing_mods ?? []) as Array<{
    id: number;
    nombre: string;
    app_id: number | null;
  }>;

  async function ensure_general_modulo(app_id: number): Promise<number> {
    const found = existing_mod_list.find((modulo) => {
      if (modulo.nombre.trim().toLowerCase() !== bucket_key) return false;
      const apps = linked_apps.get(modulo.id) ?? [];
      const owner = Number(modulo.app_id);
      if (owner === app_id) return true;
      if (apps.includes(app_id) && owner !== general_app_id) return true;
      return owner === general_app_id && app_id === general_app_id;
    });
    if (found) {
      const { error: link_error } = await supabase
        .from("ted_plan_modulo_apps" as never)
        .upsert(
          { modulo_id: found.id, app_id } as never,
          { onConflict: "modulo_id,app_id" },
        );
      if (link_error) {
        console.error("[planificacion] import general apps:", link_error);
        return 0;
      }
      const list = linked_apps.get(found.id) ?? [];
      if (!list.includes(app_id)) {
        list.push(app_id);
        linked_apps.set(found.id, list);
      }
      return found.id;
    }
    const related = [...hang_rows, ...app_module_rows].filter((row) =>
      row.app_ids.includes(app_id),
    );
    const starts = related
      .map((row) => row.fecha_inicio)
      .filter((value): value is string => Boolean(value))
      .sort();
    const first = starts[0] ?? `${input.anio}-01-01`;
    const { data, error } = await supabase
      .from("ted_plan_modulos" as never)
      .insert({
        app_id,
        nombre: GENERAL_FALLBACK_MODULO,
        trimestre_entrega: trimestre_from_iso(first),
        anio: Number(first.slice(0, 4)) || input.anio,
        created_by: user_id,
      } as never)
      .select("id")
      .single();
    if (error || !data) {
      console.error("[planificacion] import general modulo:", error);
      return 0;
    }
    const modulo_id = Number((data as { id: number }).id);
    created_modulos += 1;
    existing_mod_list.push({
      id: modulo_id,
      nombre: GENERAL_FALLBACK_MODULO,
      app_id,
    });
    linked_apps.set(modulo_id, [app_id]);
    const { error: link_error } = await supabase
      .from("ted_plan_modulo_apps" as never)
      .upsert(
        { modulo_id, app_id } as never,
        { onConflict: "modulo_id,app_id" },
      );
    if (link_error) {
      console.error("[planificacion] import general apps:", link_error);
      return 0;
    }
    return modulo_id;
  }

  let general_bucket_id = 0;
  if (hang_rows.length > 0) {
    general_bucket_id = await ensure_general_modulo(general_app_id);
    if (general_bucket_id <= 0) {
      return { ok: false, error: "No se pudo crear el módulo General." };
    }
  }

  const general_by_app = new Map<number, number>();
  for (const app_id of [
    ...new Set(app_module_rows.flatMap((row) => row.app_ids)),
  ]) {
    const modulo_id = await ensure_general_modulo(app_id);
    if (modulo_id <= 0) {
      return {
        ok: false,
        error: "No se pudo crear el módulo General de la app.",
      };
    }
    general_by_app.set(app_id, modulo_id);
  }

  const now = new Date().toISOString();
  let created_tareas = 0;
  const failed: string[] = [];
  const { data: existing_tareas } = await supabase
    .from("ted_plan_tareas" as never)
    .select("id, titulo, modulo_id");
  const known = new Map<string, number>();
  for (const tarea of (existing_tareas ?? []) as Array<{
    id: number;
    titulo: string;
    modulo_id: number;
  }>) {
    known.set(`${tarea.modulo_id}::${tarea.titulo}`, tarea.id);
  }

  const ops: Array<{ row: (typeof rows)[number]; modulo_id: number }> = [];
  for (const row of rows) {
    if (row.hang_on_general) {
      ops.push({ row, modulo_id: general_bucket_id });
      continue;
    }
    if (row.hang_on_app_module) {
      for (const app_id of row.app_ids) {
        const modulo_id = general_by_app.get(app_id);
        if (modulo_id) ops.push({ row, modulo_id });
      }
      continue;
    }
    const modulo_id = modulo_id_by_name.get(row.modulo.trim().toLowerCase());
    if (modulo_id) ops.push({ row, modulo_id });
    else failed.push(`Fila ${row.row}: módulo ${row.modulo}`);
  }

  for (const { row, modulo_id } of ops) {
    if (!modulo_id) {
      failed.push(`Fila ${row.row}: módulo ${row.modulo}`);
      continue;
    }
    const dup = `${modulo_id}::${row.titulo_guardado}`;
    const no_solicitada = Boolean(row.no_solicitada);
    const avance = no_solicitada ? 0 : row.avance;
    const estado = {
      avance,
      no_solicitada,
      completada: !no_solicitada && avance >= 100,
      completada_at: !no_solicitada && avance >= 100 ? now : null,
      completada_by: !no_solicitada && avance >= 100 ? user_id : null,
    };
    const existing_id = known.get(dup);
    if (existing_id) {
      const patch = {
        orden: row.orden,
        en_planificacion: true,
        ...(no_solicitada
          ? {
              no_solicitada: true,
              avance: 0,
              completada: false,
              completada_at: null,
              completada_by: null,
            }
          : { no_solicitada: false }),
      };
      const { error } = await supabase
        .from("ted_plan_tareas" as never)
        .update(patch as never)
        .eq("id", existing_id);
      if (error) {
        console.error("[planificacion] import update tarea:", error);
        failed.push(`Fila ${row.row}: ${row.titulo_guardado}`);
      }
      continue;
    }
    known.set(dup, -1);
    const tipo = row.entregable_tipo;
    const ruta =
      tipo === "vista" ? normalize_prisma_path(row.entregable_ruta ?? "") : null;
    const { error } = await supabase.from("ted_plan_tareas" as never).insert({
      modulo_id,
      titulo: row.titulo_guardado,
      origen: row.origen,
      ...estado,
      entregable_tipo: tipo,
      entregable_ruta: tipo === "vista" ? ruta : null,
      created_by: user_id,
      fecha_inicio: row.fecha_inicio ?? null,
      fecha_fin: row.fecha_fin ?? null,
      orden: row.orden,
      en_planificacion: true,
    } as never);
    if (error) {
      console.error("[planificacion] import tarea:", error);
      failed.push(
        `Fila ${row.row}: ${row.titulo_guardado} (${error.message})`,
      );
      continue;
    }
    created_tareas += 1;
  }

  revalidatePath("/ted/planificacion");
  revalidatePath("/ted/planificacion/importar");
  return { ok: true, created_modulos, created_tareas, failed };
}
