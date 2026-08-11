export type OsiCostVisibilityFormato = "capacitacion" | "servicios_tecnicos";

export type OsiCostVisibilityConfigRow = {
  formato: OsiCostVisibilityFormato;
  allowed_role_slugs: string[];
  allowed_departamento_ids: number[];
  default_public_cost_mask: Record<string, boolean>;
  default_hide_monetary: boolean;
};

export type OsiCostVisibilityUserContext = {
  role: string | null;
  role_slugs?: string[];
  departamento_id: number | null;
  permission_slugs?: string[];
};

function normalize_role_slug(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[:\s]+/g, "_")
    .replace(/_+/g, "_");
}

function parse_json_string_array(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function parse_json_number_array(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n = Number(item);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

function parse_mask_record(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = Boolean(raw);
  }
  return out;
}

export function parse_osi_cost_visibility_row(
  row: Record<string, unknown> | null | undefined,
): OsiCostVisibilityConfigRow | null {
  if (!row) return null;
  const formato = row.formato;
  if (formato !== "capacitacion" && formato !== "servicios_tecnicos") return null;
  return {
    formato,
    allowed_role_slugs: parse_json_string_array(row.allowed_role_slugs),
    allowed_departamento_ids: parse_json_number_array(
      row.allowed_departamento_ids,
    ),
    default_public_cost_mask: parse_mask_record(row.default_public_cost_mask),
    default_hide_monetary: Boolean(row.default_hide_monetary),
  };
}

function role_matches_allowed(
  ctx: OsiCostVisibilityUserContext,
  allowed_role_slugs: string[],
): boolean {
  if (allowed_role_slugs.length === 0) return false;
  const normalized_allowed = allowed_role_slugs.map(normalize_role_slug);
  const candidates = [
    ctx.role,
    ...(ctx.role_slugs ?? []),
  ].map(normalize_role_slug);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (normalized_allowed.includes(candidate)) return true;
    if (
      normalized_allowed.some(
        (allowed) =>
          candidate.includes(allowed) || allowed.includes(candidate),
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Determina si el usuario puede ver costos privados (Cap máscara / montos ST).
 */
export function user_can_reveal_osi_costs(
  formato: OsiCostVisibilityFormato,
  config: OsiCostVisibilityConfigRow | null,
  ctx: OsiCostVisibilityUserContext,
): boolean {
  if (!config) {
    if (formato === "capacitacion") {
      return (ctx.permission_slugs ?? []).includes("finance:osi:edit");
    }
    const role = normalize_role_slug(ctx.role);
    return (
      role.includes("superadmin") ||
      role === "admin" ||
      role.includes("administrador") ||
      role === "gestor_financiero"
    );
  }

  if (role_matches_allowed(ctx, config.allowed_role_slugs)) return true;

  const deptId = ctx.departamento_id;
  if (
    deptId != null &&
    deptId > 0 &&
    config.allowed_departamento_ids.includes(deptId)
  ) {
    return true;
  }

  if (
    formato === "capacitacion" &&
    (ctx.permission_slugs ?? []).includes("finance:osi:edit")
  ) {
    return true;
  }

  return false;
}
