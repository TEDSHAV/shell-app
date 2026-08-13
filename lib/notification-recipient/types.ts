export const SPECIAL_RULE_KEYS = [
  "owner",
  "creator",
  "suplente",
  "ejecutivo_trato",
  "solicitante",
  "assignee",
  "match_ejecutivo_nombre",
  "broadcast_app_members",
  "lider_gerencia",
  "coordinador_departamento",
  "departamento_admin_ilike",
  "departamento_capacitacion_ilike",
  "creador_requisicion",
] as const;

export type SpecialRuleKey = (typeof SPECIAL_RULE_KEYS)[number];

export type NotificationEventCatalogRow = {
  app_slug: string;
  event_key: string;
  title: string | null;
  description: string | null;
  trigger_kind: string | null;
  trigger_ref: string | null;
  is_active: boolean;
  default_priority: number;
  channel_mask: Record<string, unknown>;
  available_special_rules: string[];
};

export type NotificationRecipientConfigRow = {
  app_slug: string;
  event_key: string;
  allowed_role_slugs: string[];
  allowed_permission_slugs: string[];
  allowed_departamento_ids: number[];
  allowed_user_ids: number[];
  denied_user_ids: number[];
  special_rules: Record<string, unknown>;
  notes: string | null;
};

export type RecipientConfigDraft = {
  title: string;
  description: string;
  trigger_kind: string;
  trigger_ref: string;
  is_active: boolean;
  allowed_departamento_ids: number[];
  allowed_user_ids: number[];
  denied_user_ids: number[];
  selected_role_keys: Set<string>;
  allowed_permission_slugs: string[];
  special_rules: Record<string, unknown>;
  notes: string;
};

export type UserAccessBadge =
  | "role"
  | "department"
  | "permission"
  | "manual"
  | "special"
  | "excluded"
  | "none";

export type UserAccessSnapshot = {
  user_id: number;
  has_access: boolean;
  /** Puede recibir según reglas contextuales (owner, ejecutivo, etc.) sin grant estático */
  may_receive_contextually: boolean;
  badges: UserAccessBadge[];
  via_role_keys: string[];
  via_permission_slugs: string[];
  via_department: boolean;
  via_special_rules: string[];
  manual: boolean;
  excluded: boolean;
  /** Reglas del evento que no se pueden evaluar por usuario sin contexto. */
  contextual_rules_on_event: string[];
};

export type EffectiveAccessSummary = {
  total: number;
  contextual_rule_labels: string[];
  by_role: Array<{ role_key: string; role_label: string; count: number }>;
  by_permission: Array<{ permission_slug: string; count: number }>;
  by_department: Array<{ departamento_id: number; nombre: string; count: number }>;
  by_special: Array<{ rule_label: string; count: number }>;
  manual_users: Array<{ user_id: number; nombre: string }>;
  excluded_users: Array<{ user_id: number; nombre: string; via_role_keys: string[] }>;
  snapshots: Map<number, UserAccessSnapshot>;
  permission_count: number;
  special_rule_count: number;
};

export type UserEventSubscriptionRow = {
  app_slug: string;
  event_key: string;
  title: string;
  description: string | null;
  is_active: boolean;
  subscribed: boolean;
  conditional: boolean;
  condition_labels: string[];
  /** Recibida en bandeja (90 días) sin coincidir con reglas estáticas */
  received_in_inbox?: boolean;
  inbox_count?: number;
};
