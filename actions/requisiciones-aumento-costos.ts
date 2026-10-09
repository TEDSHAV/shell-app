"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUserUsuarioId, getRequisicionAccess } from "@/actions/requisiciones-access-context";
import { notifyAdminsOfNewRequisicion } from "@/actions/requisicion-notifications";
import { deptNameInList } from "@/lib/requisiciones-gerencia";
import {
  analyze_req_osi_cost_gate,
  consume_shared_air,
  resolve_osi_cost_for_req,
  sum_req_direct_cost,
  type OsiReqSlice,
  type ReqOsiCostGateResult,
} from "@/lib/osi-req-cost-gate";
import type { RequisicionFormData } from "@/types/requisiciones";

function parse_desglose(value: unknown): OsiReqSlice[] {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(raw)) return [];
    return raw.filter((row) => row && typeof row === "object") as OsiReqSlice[];
  } catch {
    return [];
  }
}

export type AumentoCostosPatch = {
  aumento_costos_estatus: "no_aplica" | "pendiente" | "aprobada" | "rechazada";
  aumento_costos_justificacion: string | null;
  aumento_costos_analisis: ReqOsiCostGateResult & {
    cost_req: number;
    cost_osi: number;
    colchon_ecc_osi: number;
    remaining_for_req: number;
    sessions_total: number;
    sessions_open: number;
    sibling_reqs: number;
  };
};

type SiblingReqRow = {
  id: number;
  id_sesion: number | null;
  tipo_solicitud: string | null;
  estatus_admin: string | null;
  coordinador_estatus: string | null;
  lider_estatus: string | null;
  aumento_costos_estatus: string | null;
  osi_fixed_items: unknown;
  additional_items: unknown;
};

function is_live_externa(row: SiblingReqRow): boolean {
  if (String(row.tipo_solicitud ?? "") === "Interno") return false;
  const rejected = new Set(["rechazada"]);
  if (rejected.has(String(row.estatus_admin ?? ""))) return false;
  if (rejected.has(String(row.coordinador_estatus ?? ""))) return false;
  if (rejected.has(String(row.lider_estatus ?? ""))) return false;
  if (rejected.has(String(row.aumento_costos_estatus ?? ""))) return false;
  return true;
}

function parse_items(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function session_ids_from_desglose(desglose: OsiReqSlice[]): number[] {
  const ids = new Set<number>();
  for (const row of desglose) {
    const id = Number(row.id_sesion ?? row.id ?? 0);
    if (id > 0) ids.add(id);
  }
  return [...ids];
}

async function compute_aumento_costos_analisis(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<
    RequisicionFormData,
    "osi_fixed_items" | "additional_items" | "id_sesion"
  >;
  justificacion: string;
  exclude_req_id?: number | null;
}): Promise<AumentoCostosPatch> {
  if (params.is_interna || !params.id_osi) {
    return {
      aumento_costos_estatus: "no_aplica",
      aumento_costos_justificacion: null,
      aumento_costos_analisis: {
        extra: 0,
        pote: 0,
        from_pool: 0,
        from_colchon: 0,
        remaining_after_req: 0,
        needs_approval: false,
        needs_justification: false,
        level: 0,
        estatus: "no_aplica",
        cost_req: 0,
        cost_osi: 0,
        colchon_ecc_osi: 0,
        remaining_for_req: 0,
        sessions_total: 0,
        sessions_open: 0,
        sibling_reqs: 0,
      },
    };
  }
  const admin = await createAdminClient();
  const { data: osi } = await admin
    .from("ejecucion_osi")
    .select(
      "osi_costo_base_catalogo,pool_consumed,pool_remaining_req,colchon_ecc_osi,id_catalogo_version,id_ecc,nivel_descuento_utilidad",
    )
    .eq("id", params.id_osi)
    .maybeSingle();
  const { data: osi_view } = await admin
    .from("v_osi_formato_completo")
    .select(
      "costo_honorarios_instructor,costo_impresion_material,costo_traslado,traslado_externo,desglose_recursos_sesiones",
    )
    .eq("id_osi", params.id_osi)
    .maybeSingle();
  const consumed = Number((osi as { pool_consumed?: number } | null)?.pool_consumed ?? 0);
  const remaining_stored_raw = (osi as { pool_remaining_req?: number | null } | null)
    ?.pool_remaining_req;
  const remaining_stored =
    remaining_stored_raw == null ? null : Number(remaining_stored_raw);
  const colchon = Number((osi as { colchon_ecc_osi?: number } | null)?.colchon_ecc_osi ?? 0);
  const osi_level = Number(
    (osi as { nivel_descuento_utilidad?: number | null } | null)
      ?.nivel_descuento_utilidad ?? 0,
  );
  const req_item = params.form.osi_fixed_items?.[0] ?? null;
  const view_totals = {
    costo_honorarios_instructor: Number(
      (osi_view as { costo_honorarios_instructor?: number } | null)
        ?.costo_honorarios_instructor ?? 0,
    ),
    costo_impresion_material: Number(
      (osi_view as { costo_impresion_material?: number } | null)
        ?.costo_impresion_material ?? 0,
    ),
    costo_traslado: Number(
      (osi_view as { costo_traslado?: number } | null)?.costo_traslado ?? 0,
    ),
    traslado_externo: Number(
      (osi_view as { traslado_externo?: number } | null)?.traslado_externo ?? 0,
    ),
  };
  const desglose = parse_desglose(
    (osi_view as { desglose_recursos_sesiones?: unknown } | null)
      ?.desglose_recursos_sesiones,
  );
  const cost_osi = resolve_osi_cost_for_req({
    view_totals,
    desglose,
    id_sesion: params.form.id_sesion ?? null,
    req_item,
  });
  const cost_req = sum_req_direct_cost({
    osi_fixed_items: params.form.osi_fixed_items,
    additional_items: params.form.additional_items,
  });
  let utilidad = 0;
  let just_n = 2;
  let percents = { n1: 10, n2: 20, n3: 30 };
  const version_id = Number(
    (osi as { id_catalogo_version?: number } | null)?.id_catalogo_version ?? 0,
  );
  const ecc_id = Number((osi as { id_ecc?: number } | null)?.id_ecc ?? 0);
  if (ecc_id > 0) {
    const { data: tot } = await admin
      .from("ecc_totales")
      .select("monto_utilidad")
      .eq("id_ecc", ecc_id)
      .maybeSingle();
    utilidad = Number((tot as { monto_utilidad?: number } | null)?.monto_utilidad ?? 0);
  }
  if (version_id > 0) {
    const { data: ver } = await admin
      .from("ecc_catalogo_version")
      .select("osi_req_justificacion_nivel,osi_utilidad_recorte_pct_n1,osi_utilidad_recorte_pct_n2,osi_utilidad_recorte_pct_n3")
      .eq("id", version_id)
      .maybeSingle();
    just_n = Number(
      (ver as { osi_req_justificacion_nivel?: number } | null)
        ?.osi_req_justificacion_nivel ?? 2,
    );
    percents = {
      n1: Number((ver as { osi_utilidad_recorte_pct_n1?: number } | null)?.osi_utilidad_recorte_pct_n1 ?? 10),
      n2: Number((ver as { osi_utilidad_recorte_pct_n2?: number } | null)?.osi_utilidad_recorte_pct_n2 ?? 20),
      n3: Number((ver as { osi_utilidad_recorte_pct_n3?: number } | null)?.osi_utilidad_recorte_pct_n3 ?? 30),
    };
  }
  let remaining =
    remaining_stored != null && Number.isFinite(remaining_stored)
      ? remaining_stored
      : Math.round(Math.max(0, utilidad * (percents.n3 / 100) - consumed) * 100) /
        100;
  let colchon_live = Math.max(0, colchon);
  const { data: sibling_rows } = await admin
    .from("requisiciones")
    .select(
      "id,id_sesion,tipo_solicitud,estatus_admin,coordinador_estatus,lider_estatus,aumento_costos_estatus,osi_fixed_items,additional_items",
    )
    .eq("id_osi", params.id_osi);
  const siblings = ((sibling_rows ?? []) as SiblingReqRow[]).filter((row) => {
    if (params.exclude_req_id && row.id === params.exclude_req_id) return false;
    return is_live_externa(row);
  });
  const sibling_extras = siblings.map((row) => {
    const items = parse_items(row.osi_fixed_items) as RequisicionFormData["osi_fixed_items"];
    const extra_items = parse_items(row.additional_items) as RequisicionFormData["additional_items"];
    const sibling_req = sum_req_direct_cost({
      osi_fixed_items: items,
      additional_items: extra_items,
    });
    const sibling_osi = resolve_osi_cost_for_req({
      view_totals,
      desglose,
      id_sesion: row.id_sesion,
      req_item: items[0] ?? null,
    });
    return Math.max(0, sibling_req - sibling_osi);
  });
  const air = consume_shared_air({
    remaining,
    colchon: colchon_live,
    extras: sibling_extras,
  });
  remaining = air.remaining;
  colchon_live = air.colchon;
  const session_ids = session_ids_from_desglose(desglose);
  const covered = new Set<number>();
  const current_sesion = Number(params.form.id_sesion ?? 0);
  if (current_sesion > 0) covered.add(current_sesion);
  for (const row of siblings) {
    const sid = Number(row.id_sesion ?? 0);
    if (sid > 0) covered.add(sid);
  }
  const sessions_total = session_ids.length || (current_sesion > 0 ? 1 : 0);
  const sessions_open = session_ids.filter((id) => !covered.has(id)).length;
  const gate = analyze_req_osi_cost_gate({
    cost_osi,
    cost_req,
    remaining_for_req: remaining,
    colchon_ecc_osi: colchon_live,
    consumed_osi: consumed,
    utilidad_ecc: utilidad,
    percents,
    nivel_justificacion_req: just_n,
    osi_level,
  });
  return {
    aumento_costos_estatus: gate.needs_approval ? "pendiente" : "no_aplica",
    aumento_costos_justificacion: String(params.justificacion ?? "").trim() || null,
    aumento_costos_analisis: {
      ...gate,
      cost_req,
      cost_osi,
      colchon_ecc_osi: colchon_live,
      remaining_for_req: remaining,
      sessions_total,
      sessions_open,
      sibling_reqs: siblings.length,
    },
  };
}

export async function preview_aumento_costos(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<
    RequisicionFormData,
    "osi_fixed_items" | "additional_items" | "id_sesion"
  >;
  exclude_req_id?: number | null;
}): Promise<AumentoCostosPatch> {
  return compute_aumento_costos_analisis({
    ...params,
    justificacion: "",
  });
}

export async function build_aumento_costos_patch(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<
    RequisicionFormData,
    "osi_fixed_items" | "additional_items" | "id_sesion"
  >;
  justificacion: string;
  exclude_req_id?: number | null;
}): Promise<AumentoCostosPatch> {
  const patch = await compute_aumento_costos_analisis(params);
  const gate = patch.aumento_costos_analisis;
  const requires_text = gate.needs_justification || gate.needs_approval;
  if (requires_text && !String(params.justificacion ?? "").trim()) {
    throw new Error(
      gate.needs_approval
        ? "El ajuste es riesgoso y queda sujeto a aprobación: escribe la justificación."
        : "El ajuste es riesgoso: escribe la justificación.",
    );
  }
  return patch;
}

async function loadAumentoPendingRow(id: number) {
  const admin = await createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select(
      "tipo_solicitud, aumento_costos_estatus, departamento, created_by, solicitante",
    )
    .eq("id", id)
    .single();
  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud === "Interno") {
    throw new Error("El sello de aumento aplica a requisiciones externas.");
  }
  if (existing.aumento_costos_estatus !== "pendiente") {
    throw new Error("Esta requisición no está pendiente de aumento de costos.");
  }
  return { admin, existing };
}

async function assertCanStampAumentoCostos(row: {
  created_by?: string | null;
  departamento?: string | null;
}) {
  const access = await getRequisicionAccess();
  const supabase = await createClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (row.created_by && userId && row.created_by === userId) {
    throw new Error("No puede sellar el aumento de su propia requisición.");
  }
  const coversDept =
    (access.can_approve_lider &&
      deptNameInList(row.departamento, access.lider_depts)) ||
    (access.can_approve_coord &&
      deptNameInList(row.departamento, access.coord_depts));
  if (!access.can_approve_aumento && !coversDept) {
    throw new Error("No tiene permiso para sellar el aumento de costos.");
  }
}

export async function approveRequisicionAumentoCostos(id: number) {
  const { admin, existing } = await loadAumentoPendingRow(id);
  await assertCanStampAumentoCostos(existing);
  const usuarioId = await getCurrentUserUsuarioId();
  const { error } = await admin
    .from("requisiciones")
    .update({
      aumento_costos_estatus: "aprobada",
      aumento_costos_por: usuarioId,
      aumento_costos_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await notifyAdminsOfNewRequisicion(
    id,
    existing.solicitante || "",
    "externa (aumento de costos aprobado)",
  );
  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

export async function rejectRequisicionAumentoCostos(id: number, motivo: string) {
  if (!motivo?.trim()) throw new Error("Debe indicar el motivo del rechazo.");
  const { admin, existing } = await loadAumentoPendingRow(id);
  await assertCanStampAumentoCostos(existing);
  const usuarioId = await getCurrentUserUsuarioId();
  const { error } = await admin
    .from("requisiciones")
    .update({
      aumento_costos_estatus: "rechazada",
      aumento_costos_por: usuarioId,
      aumento_costos_en: new Date().toISOString(),
      aumento_costos_motivo_rechazo: motivo.trim(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}
