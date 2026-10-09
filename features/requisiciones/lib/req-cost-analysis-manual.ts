export type ReqCostManualCatalog = {
  n1: number;
  n2: number;
  n3: number;
  justificacion_req: number;
};

export type ReqCostManualModel = ReqCostManualCatalog & {
  utilidad_ejemplo: number;
  cap_n1: number;
  cap_n2: number;
  cap_n3: number;
};

function money(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

export function usd(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function build_req_cost_manual_model(
  row?: Partial<ReqCostManualCatalog> | null,
  utilidad = 1000,
): ReqCostManualModel {
  const n1 = Number(row?.n1 ?? 10) || 10;
  const n2 = Number(row?.n2 ?? 20) || 20;
  const n3 = Number(row?.n3 ?? 30) || 30;
  const justificacion_req = Math.min(
    3,
    Math.max(1, Math.floor(Number(row?.justificacion_req ?? 2))),
  );
  return {
    n1,
    n2,
    n3,
    justificacion_req,
    utilidad_ejemplo: utilidad,
    cap_n1: money(utilidad * (n1 / 100)),
    cap_n2: money(utilidad * (n2 / 100)),
    cap_n3: money(utilidad * (n3 / 100)),
  };
}

export function can_see_req_cost_sensitive_manual(access: {
  can_approve_aumento: boolean;
  can_approve_coord: boolean;
  roles_by_app: Record<string, string>;
}): boolean {
  if (access.can_approve_aumento || access.can_approve_coord) return true;
  const roles = Object.values(access.roles_by_app).map((role) =>
    String(role ?? "").toLowerCase(),
  );
  return roles.some(
    (role) =>
      role.includes("superadmin") ||
      role === "admin" ||
      role.includes("administrador") ||
      role === "coordinador" ||
      role === "gestor_financiero",
  );
}
