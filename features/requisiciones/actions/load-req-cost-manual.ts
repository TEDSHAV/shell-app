"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequisicionAccess } from "@/actions/requisiciones-access-context";
import {
  build_req_cost_manual_model,
  can_see_req_cost_sensitive_manual,
  type ReqCostManualModel,
} from "../lib/req-cost-analysis-manual";

export async function load_req_cost_manual_page(): Promise<{
  sensitive: boolean;
  model: ReqCostManualModel | null;
}> {
  const access = await getRequisicionAccess();
  const sensitive = can_see_req_cost_sensitive_manual(access);
  if (!sensitive) {
    return { sensitive: false, model: null };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("ecc_catalogo_version")
    .select(
      "osi_utilidad_recorte_pct_n1,osi_utilidad_recorte_pct_n2,osi_utilidad_recorte_pct_n3,osi_req_justificacion_nivel",
    )
    .eq("es_vigente", true)
    .maybeSingle();
  const row = data as {
    osi_utilidad_recorte_pct_n1?: number;
    osi_utilidad_recorte_pct_n2?: number;
    osi_utilidad_recorte_pct_n3?: number;
    osi_req_justificacion_nivel?: number;
  } | null;
  return {
    sensitive: true,
    model: build_req_cost_manual_model({
      n1: row?.osi_utilidad_recorte_pct_n1,
      n2: row?.osi_utilidad_recorte_pct_n2,
      n3: row?.osi_utilidad_recorte_pct_n3,
      justificacion_req: row?.osi_req_justificacion_nivel,
    }),
  };
}
