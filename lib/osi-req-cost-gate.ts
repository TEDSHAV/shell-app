export type ReqOsiCostGateResult = {
  extra: number;
  pote: number;
  from_pool: number;
  from_colchon: number;
  remaining_after_req: number;
  needs_approval: boolean;
  needs_justification: boolean;
  level: 0 | 1 | 2 | 3;
  estatus: "no_aplica" | "pendiente" | "justifica";
};

function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function sum_req_direct_cost(params: {
  osi_fixed_items?: Array<{
    costo_traslado?: number | null;
    impresion_total?: number | null;
    honorarios_total?: number | null;
    informe_final_total?: number | null;
  }>;
  additional_items?: Array<{ total?: number | null }>;
}): number {
  const from_fixed = (params.osi_fixed_items ?? []).reduce((sum, row) => {
    return (
      sum +
      Number(row.costo_traslado ?? 0) +
      Number(row.impresion_total ?? 0) +
      Number(row.honorarios_total ?? 0) +
      Number(row.informe_final_total ?? 0)
    );
  }, 0);
  const from_extra = (params.additional_items ?? []).reduce(
    (sum, row) => sum + Number(row.total ?? 0),
    0,
  );
  return money(from_fixed + from_extra);
}

export function analyze_req_osi_cost_gate(params: {
  cost_osi: number;
  cost_req: number;
  remaining_for_req: number;
  colchon_ecc_osi: number;
  consumed_osi: number;
  utilidad_ecc: number;
  percents?: { n1?: number; n2?: number; n3?: number };
  nivel_justificacion_req?: number;
}): ReqOsiCostGateResult {
  const extra = money(Math.max(0, params.cost_req - params.cost_osi));
  const remaining_pool = money(Math.max(0, params.remaining_for_req));
  const colchon = money(Math.max(0, params.colchon_ecc_osi));
  const pote = money(remaining_pool + colchon);
  const from_pool = money(Math.min(extra, remaining_pool));
  const from_colchon = money(
    Math.min(Math.max(0, extra - remaining_pool), colchon),
  );
  const remaining_after_req = money(Math.max(0, pote - extra));
  const needs_approval = extra > pote;
  const n1 = money((params.utilidad_ecc || 0) * ((params.percents?.n1 ?? 10) / 100));
  const n2 = money((params.utilidad_ecc || 0) * ((params.percents?.n2 ?? 20) / 100));
  const consumed_after = money(Math.max(0, params.consumed_osi) + from_pool);
  let level: 0 | 1 | 2 | 3 = 0;
  if (consumed_after <= 0) level = 0;
  else if (consumed_after <= n1 || n1 <= 0) level = 1;
  else if (consumed_after <= n2) level = 2;
  else level = 3;
  const just_n = Math.min(
    3,
    Math.max(1, Math.floor(Number(params.nivel_justificacion_req ?? 2))),
  );
  const needs_justification =
    extra > 0 && !needs_approval && level >= just_n;
  let estatus: ReqOsiCostGateResult["estatus"] = "no_aplica";
  if (needs_approval) estatus = "pendiente";
  else if (needs_justification) estatus = "justifica";
  return {
    extra,
    pote,
    from_pool,
    from_colchon,
    remaining_after_req,
    needs_approval,
    needs_justification,
    level,
    estatus,
  };
}
