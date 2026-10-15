"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import type { RequisicionItem } from "@/types/requisiciones";
import type {
  ReqDeposito,
  ReqKardexRow,
  ReqOsiRepartoRow,
  ReqStockRow,
} from "@/features/requisiciones/lib/req-stock-types";

function as_stock_rows(data: unknown): ReqStockRow[] {
  return (Array.isArray(data) ? data : []) as ReqStockRow[];
}

async function can_manage_stock(): Promise<boolean> {
  const access = await getRequisicionAccess();
  return access.can_process;
}

export async function list_req_stock_action(
  deposito: ReqDeposito,
): Promise<ReqStockRow[]> {
  if (!(await can_manage_stock())) return [];
  const supabase = await createClient();
  const view =
    deposito === "departamento"
      ? "v_req_stock_departamento"
      : "v_req_stock_servicio";
  let query = supabase.from(view as never).select("*").order("nombre_item");
  if (deposito !== "departamento") {
    query = query.eq("deposito", deposito);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[list_req_stock_action]", error.message);
    return [];
  }
  return as_stock_rows(data);
}

export async function list_req_kardex_action(
  id_stock: number,
): Promise<ReqKardexRow[]> {
  if (!(await can_manage_stock())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_req_kardex" as never)
    .select("*")
    .eq("id_stock", id_stock)
    .order("creado_en", { ascending: false })
    .limit(80);
  if (error) {
    console.error("[list_req_kardex_action]", error.message);
    return [];
  }
  return (data || []) as ReqKardexRow[];
}

export async function list_req_osis_reparto_action(
  deposito: ReqDeposito,
  id_item_costo: number,
): Promise<ReqOsiRepartoRow[]> {
  if (!(await can_manage_stock())) return [];
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

export async function registrar_salida_stock_action(params: {
  id_stock: number;
  tipo: "entregado" | "gastado" | "danado" | "cambiado";
  cantidad: number;
  notas?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await can_manage_stock())) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = await createClient();
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
  if (!(await can_manage_stock())) {
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
