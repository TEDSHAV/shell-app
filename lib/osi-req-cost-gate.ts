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

export type OsiReqSlice = {
  id?: number | null;
  id_sesion?: number | null;
  nro_sesion?: number | null;
  costo_traslado?: number | null;
  traslado_externo?: number | null;
  costo_impresion_material?: number | null;
  impresion_total?: number | null;
  costo_honorarios_instructor?: number | null;
  honorarios_total?: number | null;
  honorarios_horas?: number | null;
  horas_honorarios_instructor?: number | null;
  informe_final_total?: number | null;
};

function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function sum_osi_req_slice(row: OsiReqSlice | null | undefined): number {
  if (!row) return 0;
  return money(
    Number(row.costo_traslado ?? 0) +
      Number(row.traslado_externo ?? 0) +
      Number(row.costo_impresion_material ?? row.impresion_total ?? 0) +
      Number(row.costo_honorarios_instructor ?? row.honorarios_total ?? 0) +
      Number(row.informe_final_total ?? 0),
  );
}

function close_money(a: number, b: number): boolean {
  return Math.abs(money(a) - money(b)) < 0.02;
}

export function resolve_osi_cost_for_req(params: {
  view_totals: OsiReqSlice;
  desglose?: OsiReqSlice[] | null;
  id_sesion?: number | null;
  req_item?: OsiReqSlice | null;
}): number {
  const rows = (params.desglose ?? []).filter((row) => row != null);
  const id_sesion = Number(params.id_sesion ?? 0);
  if (id_sesion > 0) {
    const by_id = rows.find(
      (row) =>
        Number(row.id_sesion ?? 0) === id_sesion ||
        Number(row.id ?? 0) === id_sesion,
    );
    const sliced = sum_osi_req_slice(by_id);
    if (sliced > 0) return sliced;
  }
  const item = params.req_item;
  if (item && rows.length > 0) {
    const req_h = Number(
      item.honorarios_total ?? item.costo_honorarios_instructor ?? 0,
    );
    const req_i = Number(
      item.impresion_total ?? item.costo_impresion_material ?? 0,
    );
    const req_hours = Number(
      item.honorarios_horas ?? item.horas_honorarios_instructor ?? 0,
    );
    const matched =
      rows.find(
        (row) =>
          close_money(
            Number(row.costo_honorarios_instructor ?? row.honorarios_total ?? 0),
            req_h,
          ) &&
          close_money(
            Number(row.costo_impresion_material ?? row.impresion_total ?? 0),
            req_i,
          ),
      ) ??
      rows.find((row) =>
        close_money(
          Number(row.horas_honorarios_instructor ?? row.honorarios_horas ?? 0),
          req_hours,
        ),
      );
    const sliced = sum_osi_req_slice(matched);
    if (sliced > 0) return sliced;
    if (rows.length === 1) return sum_osi_req_slice(rows[0]);
  }
  return sum_osi_req_slice(params.view_totals);
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

/** S3: extras already committed by other REQs eat remaining, then colchón. */
export function consume_shared_air(params: {
  remaining: number;
  colchon: number;
  extras: number[];
}): { remaining: number; colchon: number } {
  let remaining = money(Math.max(0, params.remaining));
  let colchon = money(Math.max(0, params.colchon));
  for (const raw of params.extras) {
    const extra = money(Math.max(0, raw));
    if (extra <= 0) continue;
    const from_pool = money(Math.min(extra, remaining));
    remaining = money(remaining - from_pool);
    const rest = money(extra - from_pool);
    const from_colchon = money(Math.min(rest, colchon));
    colchon = money(colchon - from_colchon);
  }
  return { remaining, colchon };
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
  osi_level?: number;
}): ReqOsiCostGateResult {
  const extra = money(Math.max(0, params.cost_req - params.cost_osi));
  const remaining_pool = money(Math.max(0, params.remaining_for_req));
  const colchon = money(Math.max(0, params.colchon_ecc_osi));
  const pote = remaining_pool;
  const from_pool = money(Math.min(extra, remaining_pool));
  const from_colchon = money(
    Math.min(Math.max(0, extra - remaining_pool), colchon),
  );
  const remaining_after_req = money(Math.max(0, remaining_pool - extra));
  if (extra <= 0) {
    return {
      extra: 0,
      pote,
      from_pool: 0,
      from_colchon: 0,
      remaining_after_req: remaining_pool,
      needs_approval: false,
      needs_justification: false,
      level: 0,
      estatus: "no_aplica",
    };
  }
  const needs_approval = extra > money(remaining_pool + colchon);
  const n1 = params.percents?.n1 ?? 10;
  const n2 = params.percents?.n2 ?? 20;
  const n3 = params.percents?.n3 ?? 30;
  const denom = n3 > 0 ? n3 : 100;
  let level: 0 | 1 | 2 | 3 = 3;
  if (remaining_pool > 0) {
    const cap1 = money(remaining_pool * (n1 / denom));
    const cap2 = money(remaining_pool * (n2 / denom));
    if (extra <= cap1) level = 1;
    else if (extra <= cap2) level = 2;
    else level = 3;
  }
  const just_n = Math.min(
    3,
    Math.max(1, Math.floor(Number(params.nivel_justificacion_req ?? 2))),
  );
  const osi_level = Math.min(3, Math.max(0, Math.floor(Number(params.osi_level ?? 0))));
  const climbed = level > osi_level;
  const needs_justification =
    extra > 0 && !needs_approval && climbed && level >= just_n;
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
