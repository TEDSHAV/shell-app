"use server";

import { createClient } from "@/lib/supabase/server";

export type ReqGatePreview = {
  cost_req: number;
  cost_osi: number;
  extra: number;
  pote: number;
  consumo_osi: number;
  needs_approval: boolean;
  estatus: string;
};

export async function preview_req_osi_gate_action(
  id_osi: number,
  cost_req: number,
): Promise<ReqGatePreview | null> {
  const supabase = await createClient();
  const { data: osi } = await supabase
    .from("ejecucion_osi")
    .select(
      "id,osi_costo_base_catalogo,pool_consumed,pool_remaining_req,colchon_ecc_osi",
    )
    .eq("id", id_osi)
    .maybeSingle();
  if (!osi) return null;

  const { data: consumo_rows } = await supabase
    .from("req_consumo_osi" as never)
    .select("cantidad,id_item_costo")
    .eq("id_osi", id_osi);
  const items = (consumo_rows || []) as Array<{
    cantidad: number;
    id_item_costo: number;
  }>;
  let consumo = 0;
  if (items.length > 0) {
    const ids = [...new Set(items.map((row) => row.id_item_costo))];
    const { data: cats } = await supabase
      .from("ecc_catalogo_costos")
      .select("id,costo_unitario_base")
      .in("id", ids);
    const by_id = new Map(
      ((cats || []) as Array<{ id: number; costo_unitario_base: number | null }>).map(
        (row) => [row.id, Number(row.costo_unitario_base || 0)],
      ),
    );
    consumo = items.reduce(
      (sum, row) => sum + Number(row.cantidad || 0) * (by_id.get(row.id_item_costo) || 0),
      0,
    );
  }

  const row = osi as {
    osi_costo_base_catalogo?: number | null;
    pool_consumed?: number | null;
    pool_remaining_req?: number | null;
    colchon_ecc_osi?: number | null;
  };
  const cost_osi =
    Number(row.osi_costo_base_catalogo || 0) + Number(row.pool_consumed || 0);
  const remaining = Number(row.pool_remaining_req || 0);
  const colchon = Math.max(0, Number(row.colchon_ecc_osi || 0));
  const total_req = Number(cost_req || 0) + consumo;
  const extra = Math.max(0, Math.round((total_req - cost_osi) * 100) / 100);
  const pote = Math.round((Math.max(0, remaining) + colchon) * 100) / 100;
  return {
    cost_req: Math.round(total_req * 100) / 100,
    cost_osi: Math.round(cost_osi * 100) / 100,
    extra,
    pote,
    consumo_osi: Math.round(consumo * 100) / 100,
    needs_approval: extra > pote,
    estatus:
      extra <= 0 ? "no_aplica" : extra > pote ? "pendiente" : "justifica",
  };
}
