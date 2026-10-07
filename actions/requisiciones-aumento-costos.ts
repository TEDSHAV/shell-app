"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserUsuarioId, getRequisicionAccess } from "@/actions/requisiciones-access-context";
import {
  analyze_req_osi_cost_gate,
  sum_req_direct_cost,
  type ReqOsiCostGateResult,
} from "@/lib/osi-req-cost-gate";
import type { RequisicionFormData } from "@/types/requisiciones";

export type AumentoCostosPatch = {
  aumento_costos_estatus: "no_aplica" | "pendiente" | "aprobada" | "rechazada";
  aumento_costos_justificacion: string | null;
  aumento_costos_analisis: ReqOsiCostGateResult & {
    cost_req: number;
    cost_osi: number;
    colchon_ecc_osi: number;
    remaining_for_req: number;
  };
};

async function compute_aumento_costos_analisis(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<RequisicionFormData, "osi_fixed_items" | "additional_items">;
  justificacion: string;
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
      },
    };
  }
  const admin = await createAdminClient();
  const { data: osi } = await admin
    .from("ejecucion_osi")
    .select(
      "osi_costo_base_catalogo,pool_consumed,pool_remaining_req,colchon_ecc_osi,id_catalogo_version,id_ecc",
    )
    .eq("id", params.id_osi)
    .maybeSingle();
  const cost_base = Number(
    (osi as { osi_costo_base_catalogo?: number } | null)?.osi_costo_base_catalogo ?? 0,
  );
  const consumed = Number((osi as { pool_consumed?: number } | null)?.pool_consumed ?? 0);
  const remaining = Number(
    (osi as { pool_remaining_req?: number } | null)?.pool_remaining_req ?? 0,
  );
  const colchon = Number((osi as { colchon_ecc_osi?: number } | null)?.colchon_ecc_osi ?? 0);
  const cost_osi = cost_base + consumed;
  const cost_req = sum_req_direct_cost({
    osi_fixed_items: params.form.osi_fixed_items,
    additional_items: params.form.additional_items,
  });
  let utilidad = 0;
  let just_n = 2;
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
    const gate = analyze_req_osi_cost_gate({
      cost_osi,
      cost_req,
      remaining_for_req: remaining,
      colchon_ecc_osi: colchon,
      consumed_osi: consumed,
      utilidad_ecc: utilidad,
      percents: {
        n1: Number((ver as { osi_utilidad_recorte_pct_n1?: number } | null)?.osi_utilidad_recorte_pct_n1 ?? 10),
        n2: Number((ver as { osi_utilidad_recorte_pct_n2?: number } | null)?.osi_utilidad_recorte_pct_n2 ?? 20),
        n3: Number((ver as { osi_utilidad_recorte_pct_n3?: number } | null)?.osi_utilidad_recorte_pct_n3 ?? 30),
      },
      nivel_justificacion_req: just_n,
    });
    const estatus = gate.needs_approval ? "pendiente" : "no_aplica";
    return {
      aumento_costos_estatus: estatus,
      aumento_costos_justificacion: String(params.justificacion ?? "").trim() || null,
      aumento_costos_analisis: {
        ...gate,
        cost_req,
        cost_osi,
        colchon_ecc_osi: colchon,
        remaining_for_req: remaining,
      },
    };
  }
  const gate = analyze_req_osi_cost_gate({
    cost_osi,
    cost_req,
    remaining_for_req: remaining,
    colchon_ecc_osi: colchon,
    consumed_osi: consumed,
    utilidad_ecc: utilidad,
    nivel_justificacion_req: just_n,
  });
  return {
    aumento_costos_estatus: gate.needs_approval ? "pendiente" : "no_aplica",
    aumento_costos_justificacion: String(params.justificacion ?? "").trim() || null,
    aumento_costos_analisis: {
      ...gate,
      cost_req,
      cost_osi,
      colchon_ecc_osi: colchon,
      remaining_for_req: remaining,
    },
  };
}

export async function preview_aumento_costos(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<RequisicionFormData, "osi_fixed_items" | "additional_items">;
}): Promise<AumentoCostosPatch> {
  return compute_aumento_costos_analisis({
    ...params,
    justificacion: "",
  });
}

export async function build_aumento_costos_patch(params: {
  is_interna: boolean;
  id_osi: number | null;
  form: Pick<RequisicionFormData, "osi_fixed_items" | "additional_items">;
  justificacion: string;
}): Promise<AumentoCostosPatch> {
  const patch = await compute_aumento_costos_analisis(params);
  const gate = patch.aumento_costos_analisis;
  const requires_text =
    gate.needs_justification || gate.needs_approval || gate.level >= 2;
  if (requires_text && !String(params.justificacion ?? "").trim()) {
    throw new Error(
      gate.needs_approval
        ? "El ajuste es riesgoso y queda sujeto a aprobación: escribe la justificación."
        : "El ajuste es riesgoso: escribe la justificación.",
    );
  }
  return patch;
}

export async function approveRequisicionAumentoCostos(id: number) {
  const access = await getRequisicionAccess();
  if (!access.can_approve_aumento) {
    throw new Error("No tiene permiso para aprobar el aumento de costos.");
  }
  const usuarioId = await getCurrentUserUsuarioId();
  const admin = await createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, aumento_costos_estatus")
    .eq("id", id)
    .single();
  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.tipo_solicitud === "Interno") {
    throw new Error("El sello de aumento aplica a requisiciones externas.");
  }
  if (existing.aumento_costos_estatus !== "pendiente") {
    throw new Error("Esta requisición no está pendiente de aumento de costos.");
  }
  const { error } = await admin
    .from("requisiciones")
    .update({
      aumento_costos_estatus: "aprobada",
      aumento_costos_por: usuarioId,
      aumento_costos_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/requisiciones");
  revalidatePath("/requisiciones/gestion");
  revalidatePath(`/requisiciones/view/${id}`);
}

export async function rejectRequisicionAumentoCostos(id: number, motivo: string) {
  if (!motivo?.trim()) throw new Error("Debe indicar el motivo del rechazo.");
  const access = await getRequisicionAccess();
  if (!access.can_approve_aumento) {
    throw new Error("No tiene permiso para rechazar el aumento de costos.");
  }
  const usuarioId = await getCurrentUserUsuarioId();
  const admin = await createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("requisiciones")
    .select("tipo_solicitud, aumento_costos_estatus")
    .eq("id", id)
    .single();
  if (fetchError || !existing) throw new Error("Requisición no encontrada.");
  if (existing.aumento_costos_estatus !== "pendiente") {
    throw new Error("Esta requisición no está pendiente de aumento de costos.");
  }
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
