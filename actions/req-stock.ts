"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import type { RequisicionItem } from "@/types/requisiciones";
import { resolve_stock_minimo } from "@/features/requisiciones/lib/req-stock-status";
import type {
  ReqDeposito,
  ReqKardexRow,
  ReqOsiRepartoRow,
  ReqStockMinimoRow,
  ReqStockRow,
} from "@/features/requisiciones/lib/req-stock-types";

function as_stock_rows(data: unknown): ReqStockRow[] {
  return (Array.isArray(data) ? data : []) as ReqStockRow[];
}

export async function can_view_depositos(): Promise<boolean> {
  const access = await getRequisicionAccess();
  return access.can_view_inventario;
}

export async function get_depositos_ui_access_action(): Promise<{
  can_view: boolean;
  can_process: boolean;
  can_consume: boolean;
  can_request: boolean;
  can_edit_minimos: boolean;
  request_depts: string[];
  home_dept: string | null;
}> {
  const access = await getRequisicionAccess();
  return {
    can_view: access.can_view_inventario,
    can_process: access.can_process,
    can_consume: access.can_consume_inventario,
    can_request: access.can_request_inventario,
    can_edit_minimos: access.can_process || access.can_edit_config,
    request_depts: access.request_depts,
    home_dept: access.home_dept,
  };
}

/** Ingreso / upsert global: solo gestion:process. */
async function can_process_ingreso(): Promise<boolean> {
  const access = await getRequisicionAccess();
  return access.can_process;
}

async function can_edit_minimos(): Promise<boolean> {
  const access = await getRequisicionAccess();
  return access.can_process || access.can_edit_config;
}

function dept_in_scope(
  departamento: string | null | undefined,
  request_depts: string[],
  home_dept: string | null,
): boolean {
  const name = (departamento || "").trim().toLowerCase();
  if (!name) return false;
  const pool = [...request_depts, home_dept || ""].filter(Boolean);
  return pool.some((d) => d.trim().toLowerCase() === name);
}

async function can_consume_stock_row(row: {
  deposito: ReqDeposito;
  departamento?: string | null;
}): Promise<boolean> {
  const access = await getRequisicionAccess();
  if (!access.can_consume_inventario) return false;
  if (access.can_process) return true;
  if (row.deposito === "departamento") {
    return dept_in_scope(
      row.departamento,
      access.request_depts,
      access.home_dept,
    );
  }
  // Cap / ST: home o request_depts del ejecutante
  const needle =
    row.deposito === "capacitacion" ? "capacita" : "tecnic";
  const pool = [...access.request_depts, access.home_dept || ""];
  return pool.some((d) => d.toLowerCase().includes(needle));
}

export async function list_req_stock_minimo_action(
  deposito?: ReqDeposito,
): Promise<ReqStockMinimoRow[]> {
  if (!(await can_view_depositos())) return [];
  const supabase = await createClient();
  let query = supabase
    .from("req_stock_minimo" as never)
    .select("id,deposito,alcance,id_categoria,id_item_costo,cantidad_minima");
  if (deposito) query = query.eq("deposito", deposito);
  const { data, error } = await query;
  if (error) {
    console.error("[list_req_stock_minimo_action]", error.message);
    return [];
  }
  return (data || []) as ReqStockMinimoRow[];
}

export async function list_req_stock_action(
  deposito: ReqDeposito,
): Promise<ReqStockRow[]> {
  if (!(await can_view_depositos())) return [];
  const supabase = await createClient();
  const view =
    deposito === "departamento"
      ? "v_req_stock_departamento"
      : "v_req_stock_servicio";
  let query = supabase.from(view as never).select("*").order("nombre_item");
  if (deposito !== "departamento") {
    query = query.eq("deposito", deposito);
  }
  const [{ data, error }, rules] = await Promise.all([
    query,
    list_req_stock_minimo_action(deposito),
  ]);
  if (error) {
    console.error("[list_req_stock_action]", error.message);
    return [];
  }
  return as_stock_rows(data).map((row) => ({
    ...row,
    minimo: resolve_stock_minimo({
      id_item_costo: row.id_item_costo,
      id_categoria: row.id_categoria ?? null,
      rules,
    }),
  }));
}

/** Saldo de ítems para el panel de análisis en el alta (abastecimiento). */
export async function lookup_stock_for_items_action(params: {
  ids_item: number[];
  deposito: ReqDeposito;
  id_departamento?: number | null;
}): Promise<
  Array<{
    id_stock: number;
    id_item_costo: number;
    cantidad: number;
    minimo: number;
    unidad: string | null;
    nombre_item: string;
    deposito: ReqDeposito;
    departamento: string | null;
  }>
> {
  if (!(await can_view_depositos())) return [];
  const ids = [...new Set(params.ids_item.filter((id) => id > 0))];
  if (ids.length === 0) return [];
  const rows = await list_req_stock_action(params.deposito);
  return rows
    .filter((row) => {
      if (!ids.includes(row.id_item_costo)) return false;
      if (
        params.deposito === "departamento" &&
        params.id_departamento != null
      ) {
        return Number(row.id_departamento) === params.id_departamento;
      }
      return row.deposito === params.deposito;
    })
    .map((row) => ({
      id_stock: row.id,
      id_item_costo: row.id_item_costo,
      cantidad: Number(row.cantidad),
      minimo: row.minimo ?? 1,
      unidad: row.unidad,
      nombre_item: row.nombre_item,
      deposito: row.deposito,
      departamento: row.departamento ?? null,
    }));
}

export async function list_req_stock_all_action(): Promise<ReqStockRow[]> {
  if (!(await can_view_depositos())) return [];
  const supabase = await createClient();
  const [depto, servicio, rules] = await Promise.all([
    supabase
      .from("v_req_stock_departamento" as never)
      .select("*")
      .order("nombre_item"),
    supabase
      .from("v_req_stock_servicio" as never)
      .select("*")
      .order("nombre_item"),
    list_req_stock_minimo_action(),
  ]);
  if (depto.error) {
    console.error("[list_req_stock_all_action]", depto.error.message);
  }
  if (servicio.error) {
    console.error("[list_req_stock_all_action]", servicio.error.message);
  }
  const all = [
    ...as_stock_rows(depto.data),
    ...as_stock_rows(servicio.data),
  ];
  return all.map((row) => ({
    ...row,
    minimo: resolve_stock_minimo({
      id_item_costo: row.id_item_costo,
      id_categoria: row.id_categoria ?? null,
      rules: rules.filter((rule) => rule.deposito === row.deposito),
    }),
  }));
}

export async function list_req_kardex_action(
  id_stock: number,
  limit = 80,
): Promise<ReqKardexRow[]> {
  if (!(await can_view_depositos())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_req_kardex" as never)
    .select("*")
    .eq("id_stock", id_stock)
    .order("creado_en", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[list_req_kardex_action]", error.message);
    return [];
  }
  return (data || []) as ReqKardexRow[];
}

export async function list_req_kardex_deposito_action(params: {
  deposito?: ReqDeposito | null;
  desde: string;
  hasta: string;
  limit?: number;
}): Promise<ReqKardexRow[]> {
  if (!(await can_view_depositos())) return [];
  const supabase = await createClient();
  let query = supabase
    .from("v_req_kardex" as never)
    .select("*")
    .gte("creado_en", `${params.desde}T00:00:00`)
    .lte("creado_en", `${params.hasta}T23:59:59.999`)
    .order("creado_en", { ascending: false })
    .limit(params.limit ?? 400);
  if (params.deposito) {
    query = query.eq("deposito", params.deposito);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[list_req_kardex_deposito_action]", error.message);
    return [];
  }
  return (data || []) as ReqKardexRow[];
}

export async function list_req_osis_reparto_action(
  deposito: ReqDeposito,
  id_item_costo: number,
): Promise<ReqOsiRepartoRow[]> {
  if (!(await can_view_depositos())) return [];
  if (deposito === "departamento") return [];
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("v_req_kardex" as never)
    .select("creado_en")
    .eq("id_item_costo", id_item_costo)
    .eq("deposito", deposito)
    .eq("tipo", "entrada")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last_row = last as { creado_en?: string } | null;
  const since =
    last_row?.creado_en ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: consumed } = await supabase
    .from("req_consumo_osi" as never)
    .select("id_osi")
    .eq("id_item_costo", id_item_costo)
    .eq("deposito", deposito);
  const consumed_rows = (consumed || []) as Array<{ id_osi: number }>;
  const taken = new Set(consumed_rows.map((row) => Number(row.id_osi)));

  const { data, error } = await supabase
    .from("v_req_osis_reparto" as never)
    .select("*")
    .eq("deposito", deposito);
  if (error) {
    console.error("[list_req_osis_reparto_action]", error.message);
    return [];
  }
  const from = Date.parse(since);
  return ((data || []) as ReqOsiRepartoRow[]).filter((row) => {
    if (taken.has(row.id_osi)) return false;
    const stamp = Date.parse(
      row.fecha_culminacion || row.fecha_emision || "",
    );
    return Number.isFinite(stamp) && stamp >= from;
  });
}

export async function count_osis_reparto_action(
  deposito: ReqDeposito,
): Promise<number> {
  if (!(await can_view_depositos())) return 0;
  if (deposito === "departamento") return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_req_osis_reparto" as never)
    .select("id_osi")
    .eq("deposito", deposito);
  if (error) return 0;
  const { data: consumed } = await supabase
    .from("req_consumo_osi" as never)
    .select("id_osi")
    .eq("deposito", deposito);
  const taken = new Set(
    ((consumed || []) as Array<{ id_osi: number }>).map((row) =>
      Number(row.id_osi),
    ),
  );
  return ((data || []) as Array<{ id_osi: number }>).filter(
    (row) => !taken.has(Number(row.id_osi)),
  ).length;
}

export async function registrar_salida_stock_action(params: {
  id_stock: number;
  tipo: "entregado" | "gastado" | "danado" | "cambiado";
  cantidad: number;
  notas?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: stock_raw } = await supabase
    .from("req_stock" as never)
    .select("id,deposito,id_departamento")
    .eq("id", params.id_stock)
    .maybeSingle();
  const stock = stock_raw as {
    id: number;
    deposito: ReqDeposito;
    id_departamento: number | null;
  } | null;
  if (!stock) return { ok: false, error: "Stock no encontrado." };

  let departamento: string | null = null;
  if (stock.id_departamento) {
    const { data: dept } = await supabase
      .from("departamentos" as never)
      .select("nombre")
      .eq("id", stock.id_departamento)
      .maybeSingle();
    departamento =
      (dept as { nombre?: string } | null)?.nombre ?? null;
  }

  if (
    !(await can_consume_stock_row({
      deposito: stock.deposito,
      departamento,
    }))
  ) {
    return { ok: false, error: "Sin permiso de consumo en este inventario." };
  }

  const { error } = await supabase.rpc("fn_req_registrar_salida" as never, {
    p_id_stock: params.id_stock,
    p_tipo: params.tipo,
    p_cantidad: params.cantidad,
    p_notas: params.notas ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/requisiciones/depositos");
  return { ok: true };
}

export async function confirmar_consumo_osi_action(params: {
  id_stock: number;
  id_osi: number;
  cantidad: number;
}): Promise<{ ok: boolean; error?: string }> {
  const access = await getRequisicionAccess();
  if (!access.can_consume_inventario && !access.can_process) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_req_confirmar_consumo_osi" as never, {
    p_id_stock: params.id_stock,
    p_id_osi: params.id_osi,
    p_cantidad: params.cantidad,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/requisiciones/depositos");
  return { ok: true };
}

export async function confirmar_consumo_osis_prorrateo_action(params: {
  id_stock: number;
  ids_osi: number[];
  cantidad: number;
}): Promise<{ ok: boolean; error?: string }> {
  const osis = params.ids_osi.filter((id) => id > 0);
  if (osis.length === 0) {
    return { ok: false, error: "Elija al menos una OSI." };
  }
  const total = Number(params.cantidad);
  if (!(total > 0)) return { ok: false, error: "Indique la cantidad." };
  const base = Math.floor((total / osis.length) * 1000) / 1000;
  let rest = Math.round((total - base * osis.length) * 1000) / 1000;
  for (let i = 0; i < osis.length; i += 1) {
    const extra = i === osis.length - 1 ? rest : 0;
    const qty = Math.round((base + extra) * 1000) / 1000;
    if (qty <= 0) continue;
    const res = await confirmar_consumo_osi_action({
      id_stock: params.id_stock,
      id_osi: osis[i],
      cantidad: qty,
    });
    if (!res.ok) return res;
  }
  return { ok: true };
}

export async function upsert_req_stock_minimo_action(params: {
  deposito: ReqDeposito;
  alcance: "general" | "categoria" | "item";
  cantidad_minima: number;
  id_categoria?: number | null;
  id_item_costo?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await can_edit_minimos())) {
    return { ok: false, error: "Sin permiso para configurar mínimos." };
  }
  if (!(params.cantidad_minima > 0)) {
    return { ok: false, error: "El mínimo debe ser mayor que cero." };
  }
  const supabase = await createClient();
  const id_categoria =
    params.alcance === "categoria" ? params.id_categoria ?? null : null;
  const id_item_costo =
    params.alcance === "item" ? params.id_item_costo ?? null : null;
  let find = supabase
    .from("req_stock_minimo" as never)
    .select("id")
    .eq("deposito", params.deposito)
    .eq("alcance", params.alcance);
  find =
    id_categoria == null
      ? find.is("id_categoria", null)
      : find.eq("id_categoria", id_categoria);
  find =
    id_item_costo == null
      ? find.is("id_item_costo", null)
      : find.eq("id_item_costo", id_item_costo);
  const { data: existing } = await find.maybeSingle();
  const row = existing as { id?: number } | null;
  const payload = {
    deposito: params.deposito,
    alcance: params.alcance,
    id_categoria,
    id_item_costo,
    cantidad_minima: params.cantidad_minima,
    actualizado_en: new Date().toISOString(),
  };
  const { error } = row?.id
    ? await supabase
        .from("req_stock_minimo" as never)
        .update(payload as never)
        .eq("id", row.id)
    : await supabase.from("req_stock_minimo" as never).insert(payload as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/requisiciones/depositos");
  return { ok: true };
}

export async function delete_req_stock_minimo_action(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await can_edit_minimos())) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("req_stock_minimo" as never)
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/requisiciones/depositos");
  return { ok: true };
}

export async function list_ingresos_pendientes_action(params: {
  id_item_costo: number;
}): Promise<
  Array<{
    id_requisicion: number;
    id_linea: number;
    cantidad: number;
    cantidad_entregada: number;
    pendiente: number;
  }>
> {
  if (!(await can_process_ingreso())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("req_lineas" as never)
    .select(
      "id,id_requisicion,cantidad,cantidad_entregada,id_item_costo,requisiciones!inner(id,estatus_admin,lider_estatus)",
    )
    .eq("id_item_costo", params.id_item_costo);
  if (error) {
    console.error("[list_ingresos_pendientes_action]", error.message);
    return [];
  }
  return ((data || []) as Array<Record<string, unknown>>)
    .map((row) => {
      const req = row.requisiciones as {
        estatus_admin?: string | null;
        lider_estatus?: string | null;
      } | null;
      const cant = Number(row.cantidad || 0);
      const delivered = Number(row.cantidad_entregada || 0);
      return {
        id_requisicion: Number(row.id_requisicion),
        id_linea: Number(row.id),
        cantidad: cant,
        cantidad_entregada: delivered,
        pendiente: cant - delivered,
        estatus_admin: req?.estatus_admin || "pendiente",
        lider_estatus: req?.lider_estatus || null,
      };
    })
    .filter((row) => {
      if (row.pendiente <= 0) return false;
      if (row.estatus_admin === "rechazada") return false;
      if (row.lider_estatus === "rechazada") return false;
      if (row.estatus_admin === "procesada") return false;
      return true;
    })
    .map(({ estatus_admin: _a, lider_estatus: _b, ...rest }) => rest);
}

export async function procesar_ingreso_action(params: {
  id_requisicion: number;
  id_linea: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await can_process_ingreso())) {
    return { ok: false, error: "Sin permiso de ingreso." };
  }
  const supabase = await createClient();
  const { data: linea, error: read_err } = await supabase
    .from("req_lineas" as never)
    .select("id,cantidad,cantidad_entregada,id_requisicion")
    .eq("id", params.id_linea)
    .eq("id_requisicion", params.id_requisicion)
    .maybeSingle();
  if (read_err || !linea) {
    return { ok: false, error: "No se encontró la línea." };
  }
  const row = linea as {
    cantidad?: number;
    cantidad_entregada?: number;
  };
  const { error } = await supabase
    .from("req_lineas" as never)
    .update({ cantidad_entregada: Number(row.cantidad || 0) } as never)
    .eq("id", params.id_linea);
  if (error) return { ok: false, error: error.message };
  await supabase.rpc("fn_req_aplicar_entradas" as never, {
    p_id_requisicion: params.id_requisicion,
  });
  revalidatePath("/requisiciones/depositos");
  return { ok: true };
}

export async function restock_en_curso_action(params: {
  id_item_costo: number;
}): Promise<boolean> {
  if (!(await can_view_depositos())) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = await getRequisicionAccess();
  let query = supabase
    .from("req_lineas" as never)
    .select("id,id_requisicion,requisiciones!inner(id,estatus_admin,created_by)")
    .eq("id_item_costo", params.id_item_costo);
  if (!access.can_process && user?.id) {
    query = query.eq("requisiciones.created_by", user.id);
  }
  const { data } = await query;
  return ((data || []) as Array<Record<string, unknown>>).some((row) => {
    const req = row.requisiciones as { estatus_admin?: string | null };
    const status = req?.estatus_admin || "pendiente";
    return status !== "procesada" && status !== "rechazada";
  });
}

export async function sync_req_entregada_and_stock(params: {
  id_requisicion: number;
  items?: RequisicionItem[] | null;
  fill_remaining?: boolean;
}): Promise<void> {
  const admin = await createAdminClient();
  const { data: req } = await admin
    .from("requisiciones")
    .select("id,clase_pedido,tipo_solicitud")
    .eq("id", params.id_requisicion)
    .maybeSingle();
  if (!req) return;
  const clase = String(req.clase_pedido || "");
  if (clase === "servicio_directo") return;
  const moves_stock =
    clase === "departamento" ||
    clase === "servicio_inventario" ||
    req.tipo_solicitud === "Interno";
  if (!moves_stock) return;

  const { data: lineas } = await admin
    .from("req_lineas")
    .select("id,nombre_item,cantidad,cantidad_entregada,cajon")
    .eq("id_requisicion", params.id_requisicion);
  if (!lineas?.length) return;

  const by_name = new Map<string, number>();
  for (const item of params.items || []) {
    const qty = Number(item.cant_entregada);
    if (Number.isFinite(qty)) {
      by_name.set(String(item.descripcion || "").trim().toLowerCase(), qty);
    }
  }

  for (const linea of lineas) {
    if (linea.cajon === "directo") continue;
    const key = String(linea.nombre_item || "").trim().toLowerCase();
    let next = Number(linea.cantidad_entregada || 0);
    if (by_name.has(key)) next = by_name.get(key) || 0;
    else if (params.fill_remaining && next <= 0) {
      next = Number(linea.cantidad || 0);
    }
    if (next === Number(linea.cantidad_entregada || 0)) continue;
    await admin
      .from("req_lineas")
      .update({ cantidad_entregada: next } as never)
      .eq("id", linea.id);
  }

  await admin.rpc("fn_req_aplicar_entradas" as never, {
    p_id_requisicion: params.id_requisicion,
  });
}
