import {
  department_nombre_matches_admin,
  department_nombre_matches_capacitacion,
  resolve_user_department_nombre,
} from "@/lib/notification-recipient/department-rules";
import type { AppRoleMembersByKey, DepartmentUserOption } from "@/lib/notification-recipient-selection";

import type { RecipientConfigDraft, SpecialRuleKey } from "@/lib/notification-recipient/types";

/** Reglas que solo aplican con contexto del evento (no predecibles por usuario). */
const CONTEXTUAL_SPECIAL_RULES = new Set<string>([
  "owner",
  "creator",
  "suplente",
  "ejecutivo_trato",
  "solicitante",
  "assignee",
  "match_ejecutivo_nombre",
  "lider_gerencia",
  "coordinador_departamento",
  "creador_requisicion",
]);

const DIRECT_TARGET_RULES = new Set<string>([
  "assignee",
  "creator",
  "owner",
  "creador_requisicion",
  "solicitante",
  "lider_gerencia",
  "coordinador_departamento",
]);

export function special_rule_label(key: string): string {
  switch (key as SpecialRuleKey) {
    case "owner":
      return "Propietario del registro";
    case "creator":
      return "Creador";
    case "suplente":
      return "Ejecutivo suplente";
    case "ejecutivo_trato":
      return "Ejecutivo del trato";
    case "solicitante":
      return "Solicitante";
    case "assignee":
      return "Destinatario / asignado";
    case "match_ejecutivo_nombre":
      return "Match por nombre ejecutivo";
    case "broadcast_app_members":
      return "Todos los miembros de app";
    case "lider_gerencia":
      return "Líder de gerencia";
    case "coordinador_departamento":
      return "Coordinador de departamento";
    case "departamento_admin_ilike":
      return "Departamento Administración";
    case "departamento_capacitacion_ilike":
      return "Departamento Capacitación";
    case "creador_requisicion":
      return "Creador de la requisición";
    default:
      return key;
  }
}

/** Usuario con al menos un rol en la app indicada (p. ej. broadcast_app_members). */
export function user_is_member_of_app(
  user_id: number,
  app_slug: string,
  role_members: AppRoleMembersByKey,
): boolean {
  const target = app_slug.trim().toLowerCase();
  if (!target) return false;
  for (const [key, members] of Object.entries(role_members)) {
    const app = key.split(":")[0] ?? "";
    if (app === target && members.some((member) => member.usuario_id === user_id)) {
      return true;
    }
  }
  return false;
}

export type SpecialRuleEvaluation = {
  /** Solo reglas evaluables por usuario (p. ej. broadcast a miembros de app). */
  via_special_rules: string[];
  broadcast_grant: boolean;
  /** El evento tiene reglas que dependen del contexto (no se asignan a todos). */
  contextual_rules_active: string[];
};

export function get_active_contextual_rule_labels(
  special_rules: Record<string, unknown>,
): string[] {
  const labels: string[] = [];
  for (const [key, value] of Object.entries(special_rules)) {
    if (value !== true) continue;
    if (CONTEXTUAL_SPECIAL_RULES.has(key)) {
      labels.push(special_rule_label(key));
    }
  }
  return labels;
}

export function is_direct_target_only_event(draft: RecipientConfigDraft): boolean {
  const has_role_or_perm =
    draft.selected_role_keys.size > 0 || draft.allowed_permission_slugs.length > 0;
  const has_dept_ids = draft.allowed_departamento_ids.length > 0;
  const has_broadcast =
    typeof draft.special_rules.broadcast_app_members === "string" &&
    draft.special_rules.broadcast_app_members.trim().length > 0;
  const has_dept_ilike =
    draft.special_rules.departamento_admin_ilike === true ||
    draft.special_rules.departamento_capacitacion_ilike === true;

  if (has_role_or_perm || has_dept_ids || has_broadcast || has_dept_ilike) {
    return false;
  }

  return Object.entries(draft.special_rules).some(
    ([key, value]) => value === true && DIRECT_TARGET_RULES.has(key),
  );
}

export function evaluate_special_rules_for_user(
  user: DepartmentUserOption,
  draft: RecipientConfigDraft,
  role_members: AppRoleMembersByKey,
  departamento_names: Map<number, string> = new Map(),
): SpecialRuleEvaluation {
  const via_special_rules: string[] = [];
  let broadcast_grant = false;
  let department_ilike_grant = false;
  const contextual_rules_active: string[] = [];
  const dept_nombre = resolve_user_department_nombre(
    user.departamento_id,
    departamento_names,
  );

  for (const [key, value] of Object.entries(draft.special_rules)) {
    if (value == null || value === false) continue;

    if (key === "broadcast_app_members" && typeof value === "string") {
      const app_slug = value.trim();
      if (!app_slug) continue;
      if (user_is_member_of_app(user.id, app_slug, role_members)) {
        broadcast_grant = true;
        via_special_rules.push(`Broadcast: ${app_slug}`);
      }
      continue;
    }

    if (key === "departamento_admin_ilike" && value === true) {
      if (department_nombre_matches_admin(dept_nombre)) {
        department_ilike_grant = true;
        via_special_rules.push(special_rule_label("departamento_admin_ilike"));
      }
      continue;
    }

    if (key === "departamento_capacitacion_ilike" && value === true) {
      if (department_nombre_matches_capacitacion(dept_nombre)) {
        department_ilike_grant = true;
        via_special_rules.push(special_rule_label("departamento_capacitacion_ilike"));
      }
      continue;
    }

    if (value !== true) continue;

    if (CONTEXTUAL_SPECIAL_RULES.has(key)) {
      contextual_rules_active.push(special_rule_label(key));
    }
  }

  return {
    via_special_rules,
    broadcast_grant: broadcast_grant || department_ilike_grant,
    contextual_rules_active,
  };
}

export function count_active_special_rules(
  special_rules: Record<string, unknown>,
): number {
  return Object.entries(special_rules).filter(
    ([, value]) => value === true || (typeof value === "string" && value.length > 0),
  ).length;
}
