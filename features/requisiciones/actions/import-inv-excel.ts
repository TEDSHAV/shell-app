"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import {
  classify_inv_excel_rows,
  EXCEL_INV_MAX_ROWS,
  kind_unidad_inventario,
  match_inv_catalog,
  resolve_ambitos_pedido,
  type InvExcelCatalogItem,
  type InvExcelRow,
  type InvModoCompra,
  type InvUnidadKind,
} from "../lib/excel-inventario";
import {
  inv_excel_commit_schema,
  type InvExcelCommitInput,
} from "../schemas-inv-excel";

export type InvExcelDepartamento = { id: number; nombre: string };
export type InvExcelUnidad = {
  id: number;
  label: string;
  kind: InvUnidadKind;
};
export type InvExcelTipoCalculo = { id: number; label: string };

function worksheet_matrix(sheet: ExcelJS.Worksheet): unknown[][] {
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values);
  });
  return matrix;
}

async function can_import_inv_excel(): Promise<boolean> {
  const access = await getRequisicionAccess();
  return access.can_process || access.can_edit_config;
}

function tipo_id_para_modo(
  modo: InvModoCompra,
  options: InvExcelTipoCalculo[],
): number | null {
  const hit = options.find((row) => {
    const raw = row.label.toLowerCase();
    const is_rec =
      raw.includes("fijo") ||
      raw.includes("mes") ||
      raw.includes("periodo") ||
      raw.includes("suscrip");
    return modo === "recurrente" ? is_rec : !is_rec;
  });
  return hit?.id ?? options[0]?.id ?? null;
}

async function load_lookups(supabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const [catalog, depts, classifiers] = await Promise.all([
    supabase
      .from("ecc_catalogo_costos" as never)
      .select("id,nombre_item,id_unidad,esta_activo")
      .eq("esta_activo", true)
      .order("nombre_item")
      .limit(5000),
    supabase
      .from("departamentos" as never)
      .select("id,nombre")
      .order("nombre"),
    supabase
      .from("conf_clasificadores" as never)
      .select("id,definicion,atributo_referencia,tabla_referencia"),
  ]);

  if (catalog.error) {
    return { ok: false as const, error: "No se pudo leer el catálogo." };
  }
  if (depts.error) {
    return { ok: false as const, error: "No se pudieron leer departamentos." };
  }
  if (classifiers.error) {
    return { ok: false as const, error: "No se pudieron leer clasificadores." };
  }

  const class_rows = (classifiers.data ?? []) as Array<{
    id: number;
    definicion: string | null;
    atributo_referencia: string | null;
    tabla_referencia: string | null;
  }>;
  const unit_by_id = new Map<number, string>();
  const unidades: InvExcelUnidad[] = [];
  const tipos: InvExcelTipoCalculo[] = [];
  const roles: Array<{ id: number; label: string }> = [];

  for (const row of class_rows) {
    const label = String(row.definicion ?? "").trim();
    if (!label) continue;
    const attr = String(row.atributo_referencia ?? "").toLowerCase();
    const tabla = String(row.tabla_referencia ?? "").toLowerCase();
    if (attr.includes("unidad") || tabla.includes("unidad")) {
      unit_by_id.set(row.id, label);
      unidades.push({
        id: row.id,
        label,
        kind: kind_unidad_inventario(label),
      });
    }
    if (attr.includes("tipo") || attr.includes("calculo") || tabla.includes("tipo")) {
      tipos.push({ id: row.id, label });
    }
    const low = label.toLowerCase();
    if (low === "inventario" || low === "interno") {
      roles.push({ id: row.id, label });
    }
  }

  const catalog_items: InvExcelCatalogItem[] = (
    (catalog.data ?? []) as Array<{
      id: number;
      nombre_item: string;
      id_unidad: number | null;
    }>
  ).map((row) => ({
    id: row.id,
    nombre_item: row.nombre_item,
    id_unidad: row.id_unidad,
    unidad_label: row.id_unidad ? unit_by_id.get(row.id_unidad) ?? null : null,
  }));

  const departamentos: InvExcelDepartamento[] = (
    (depts.data ?? []) as Array<{ id: number; nombre: string }>
  ).map((row) => ({ id: row.id, nombre: row.nombre }));

  unidades.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "stock" ? -1 : 1;
    return a.label.localeCompare(b.label, "es");
  });

  return {
    ok: true as const,
    catalog: catalog_items,
    departamentos,
    unidades,
    tipos,
    roles,
  };
}

export async function preview_inv_excel(
  form: FormData,
): Promise<
  | {
      ok: true;
      rows: InvExcelRow[];
      catalog: InvExcelCatalogItem[];
      departamentos: InvExcelDepartamento[];
      unidades: InvExcelUnidad[];
      tipos: InvExcelTipoCalculo[];
    }
  | { ok: false; error: string }
> {
  if (!(await can_import_inv_excel())) {
    return { ok: false, error: "Sin permiso para cargar inventario." };
  }
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

  const supabase = await createAdminClient();
  const lookups = await load_lookups(supabase);
  if (!lookups.ok) return lookups;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return { ok: false, error: "El libro no tiene hojas." };
    const matrix = worksheet_matrix(sheet);
    if (matrix.length > EXCEL_INV_MAX_ROWS + 12) {
      return {
        ok: false,
        error: `El archivo tiene más de ${EXCEL_INV_MAX_ROWS} filas.`,
      };
    }
    const classified = classify_inv_excel_rows(matrix);
    const rows = match_inv_catalog(classified, lookups.catalog);
    return {
      ok: true,
      rows,
      catalog: lookups.catalog,
      departamentos: lookups.departamentos,
      unidades: lookups.unidades,
      tipos: lookups.tipos,
    };
  } catch (error) {
    console.error("[inv-excel] preview:", error);
    return { ok: false, error: "No se pudo leer el Excel. Usa .xlsx." };
  }
}

export async function commit_inv_excel(
  raw: InvExcelCommitInput,
): Promise<
  | {
      ok: true;
      created: number;
      updated: number;
      stocked: number;
      skipped_recurrente: number;
      failed: string[];
    }
  | { ok: false; error: string }
> {
  const parsed = inv_excel_commit_schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  if (!(await can_import_inv_excel())) {
    return { ok: false, error: "Sin permiso para cargar inventario." };
  }

  const supabase = await createAdminClient();
  const lookups = await load_lookups(supabase);
  if (!lookups.ok) return lookups;

  const role_inventario =
    lookups.roles.find((row) => row.label.toLowerCase() === "inventario")?.id ??
    null;
  const role_interno =
    lookups.roles.find((row) => row.label.toLowerCase() === "interno")?.id ??
    null;

  let created = 0;
  let updated = 0;
  let stocked = 0;
  let skipped_recurrente = 0;
  const failed: string[] = [];

  for (const row of parsed.data.rows) {
    const ejecutantes =
      row.ejecutantes.length > 0
        ? row.ejecutantes
        : parsed.data.ejecutantes_default;
    const resolved = resolve_ambitos_pedido({
      obedece: row.obedece,
      ejecutantes: row.obedece === "no" ? [] : ejecutantes,
    });
    if (resolved.error) {
      failed.push(`Fila ${row.row}: ${resolved.error}`);
      continue;
    }
    if (row.modo_compra === "recurrente" && !row.periodicidad) {
      failed.push(`Fila ${row.row}: falta periodicidad.`);
      continue;
    }

    const id_tipo = tipo_id_para_modo(row.modo_compra, lookups.tipos);
    const id_unidad = row.id_unidad ?? parsed.data.id_unidad_default;
    const roles_pedido =
      row.obedece === "no"
        ? ["interno"]
        : row.obedece === "ambos"
          ? ["interno", "inventario"]
          : ["inventario"];
    const id_rol =
      row.obedece === "si"
        ? role_inventario
        : row.obedece === "ambos"
          ? role_inventario ?? role_interno
          : role_interno;

    const payload = {
      nombre_item: row.concepto,
      costo_unitario_base: 0,
      id_unidad,
      id_tipo_calculo: id_tipo,
      ambito_catalogo: resolved.ambito_catalogo,
      id_rol,
      roles_pedido,
      ambitos_pedido: resolved.ambitos,
      id_departamentos:
        row.obedece === "si" ? [] : row.id_departamentos,
      periodicidad_suscripcion:
        row.modo_compra === "recurrente" ? row.periodicidad : null,
      esta_activo: true,
      es_fijo_base: false,
    };

    let item_id = row.id_item_match;
    if (item_id) {
      const { error } = await supabase
        .from("ecc_catalogo_costos" as never)
        .update(payload as never)
        .eq("id", item_id);
      if (error) {
        failed.push(`Fila ${row.row}: ${error.message}`);
        continue;
      }
      updated += 1;
    } else {
      const { data, error } = await supabase
        .from("ecc_catalogo_costos" as never)
        .insert(payload as never)
        .select("id")
        .single();
      if (error || !data) {
        failed.push(`Fila ${row.row}: ${error?.message ?? "insert falló"}`);
        continue;
      }
      item_id = Number((data as { id: number }).id);
      created += 1;
    }

    if (row.modo_compra === "recurrente") {
      skipped_recurrente += 1;
      continue;
    }

    const stock_targets: Array<{
      deposito: string;
      id_departamento: number | null;
    }> = [];
    if (row.obedece === "no" || row.obedece === "ambos") {
      const dept_ids =
        row.id_departamentos.length > 0
          ? row.id_departamentos
          : lookups.departamentos.map((d) => d.id);
      for (const id_departamento of dept_ids) {
        stock_targets.push({
          deposito: "departamento",
          id_departamento,
        });
      }
    }
    if (row.obedece === "si" || row.obedece === "ambos") {
      for (const deposito of ejecutantes) {
        stock_targets.push({
          deposito,
          id_departamento: null,
        });
      }
    }

    for (const target of stock_targets) {
      const { error } = await supabase.rpc("fn_req_stock_upsert" as never, {
        p_id_item: item_id,
        p_deposito: target.deposito,
        p_id_departamento: target.id_departamento,
      } as never);
      if (error) {
        failed.push(
          `Fila ${row.row} stock ${target.deposito}: ${error.message}`,
        );
        continue;
      }
      stocked += 1;
    }
  }

  revalidatePath("/requisiciones/depositos");
  revalidatePath("/requisiciones/catalogo-base");

  return {
    ok: true,
    created,
    updated,
    stocked,
    skipped_recurrente,
    failed,
  };
}
