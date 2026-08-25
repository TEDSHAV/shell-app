import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GraduationCap,
  Layers,
  Megaphone,
  Shield,
} from "lucide-react";

import type { NotificationEventCatalogRow } from "@/lib/notification-recipient-config";
import {
  build_user_subscription_row as build_subscription_row_from_draft,
  draft_from_event_and_config,
  type NotificationRecipientConfigRow,
  type UserEventSubscriptionRow,
} from "@/lib/notification-recipient-config";
import type { InboxSummariesByAuthId } from "@/lib/notification-recipient/inbox-summary";
import { merge_inbox_into_subscription_rows } from "@/lib/notification-recipient/inbox-summary";
import type {
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";

export type NotificationCatalogGroupId =
  | "negocios"
  | "marketing"
  | "capacitacion"
  | "administracion"
  | "general";

export type NotificationCatalogGroupMeta = {
  id: NotificationCatalogGroupId;
  label: string;
  description: string;
  icon: LucideIcon;
  brand_color: string;
  accent_class: string;
};

const MARKETING_EVENT_KEYS = new Set([
  "lead_available",
  "lead_assignment_self",
  "lead_assignment_rr",
  "coverage_assigned",
]);

/** Utilidades sgestion que se agrupan en General (no flujo Negocios). */
const GENERAL_SGESION_EVENT_KEYS = new Set([
  "task_due_today",
  "user_reminder",
  "scheduled_reminder",
  "comment_mention",
]);

export const NOTIFICATION_CATALOG_GROUPS: NotificationCatalogGroupMeta[] = [
  {
    id: "negocios",
    label: "Negocios",
    description:
      "Flujo comercial-operativo: ECC, presupuestos, OSI, SOLPED y avisos del pipeline.",
    icon: Briefcase,
    brand_color: "#159714",
    accent_class: "bg-[#159714]/10 text-[#159714]",
  },
  {
    id: "marketing",
    label: "Marketing",
    description:
      "Leads, asignaciones comerciales, round-robin y suplencias del equipo de ventas.",
    icon: Megaphone,
    brand_color: "#EC4899",
    accent_class: "bg-[#EC4899]/10 text-[#EC4899]",
  },
  {
    id: "capacitacion",
    label: "Capacitación",
    description:
      "Diseño de servicios, OSI cross-app y avisos del área de cursos y planificación.",
    icon: GraduationCap,
    brand_color: "#C30DFF",
    accent_class: "bg-[#C30DFF]/10 text-[#C30DFF]",
  },
  {
    id: "administracion",
    label: "Administración",
    description:
      "Requisiciones internas, aprobaciones de líderes/coordinadores y avisos administrativos.",
    icon: Shield,
    brand_color: "#4F46E5",
    accent_class: "bg-[#4F46E5]/10 text-[#4F46E5]",
  },
  {
    id: "general",
    label: "General",
    description:
      "Utilidades Shell y avisos transversales: tareas, comentarios, recordatorios y consulta OSI.",
    icon: Layers,
    brand_color: "#7c3aed",
    accent_class: "bg-[#7c3aed]/10 text-[#7c3aed]",
  },
];

const GROUP_BY_ID = new Map(
  NOTIFICATION_CATALOG_GROUPS.map((group) => [group.id, group]),
);

export function get_catalog_group_meta(
  group_id: NotificationCatalogGroupId,
): NotificationCatalogGroupMeta {
  return GROUP_BY_ID.get(group_id) ?? NOTIFICATION_CATALOG_GROUPS[0]!;
}

export function resolve_catalog_group(event: {
  app_slug: string;
  event_key: string;
}): NotificationCatalogGroupId {
  if (event.app_slug === "shell") return "general";
  if (
    event.app_slug === "administracion" ||
    event.app_slug === "sadministracion"
  ) {
    return "administracion";
  }
  if (event.app_slug === "scapacitacion" || event.app_slug === "capacitacion") {
    return "capacitacion";
  }
  if (event.app_slug === "sgestion") {
    if (MARKETING_EVENT_KEYS.has(event.event_key)) return "marketing";
    if (GENERAL_SGESION_EVENT_KEYS.has(event.event_key)) return "general";
    return "negocios";
  }
  return "negocios";
}

export type NotificationCatalogGroupView<T extends NotificationEventCatalogRow> =
  {
    group: NotificationCatalogGroupMeta;
    events: T[];
  };

export function group_events_by_catalog<T extends NotificationEventCatalogRow>(
  events: T[],
): NotificationCatalogGroupView<T>[] {
  const buckets = new Map<NotificationCatalogGroupId, T[]>();
  for (const group of NOTIFICATION_CATALOG_GROUPS) {
    buckets.set(group.id, []);
  }

  for (const event of events) {
    const group_id = resolve_catalog_group(event);
    buckets.get(group_id)?.push(event);
  }

  return NOTIFICATION_CATALOG_GROUPS.map((group) => ({
    group,
    events: (buckets.get(group.id) ?? []).sort((a, b) =>
      (a.title ?? a.event_key).localeCompare(b.title ?? b.event_key, "es"),
    ),
  })).filter((entry) => entry.events.length > 0);
}

export type UserSubscriptionGroupSummary = {
  group_id: NotificationCatalogGroupId;
  label: string;
  count: number;
  sample_titles: string[];
};

export type UserSubscriptionSummary = {
  total_subscribed: number;
  total_conditional: number;
  total_inbox_events: number;
  total_active_events: number;
  by_group: UserSubscriptionGroupSummary[];
  rows: UserEventSubscriptionRow[];
};

type BuildUserSubscriptionSummariesInput = {
  usuarios: DepartmentUserOption[];
  events: NotificationEventCatalogRow[];
  configs: NotificationRecipientConfigRow[];
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  permission_members: PermissionMembersByKey;
  departamento_names: Map<number, string>;
  inbox_by_auth_id?: import("@/lib/notification-recipient/inbox-summary").InboxSummariesByAuthId;
  active_events_only?: boolean;
};

export function build_user_subscription_row(
  user: DepartmentUserOption,
  event: NotificationEventCatalogRow,
  config: NotificationRecipientConfigRow | null,
  app_roles: AppRoleOption[],
  role_members: AppRoleMembersByKey,
  permission_members: PermissionMembersByKey,
  departamento_names: Map<number, string>,
): UserEventSubscriptionRow {
  const draft = draft_from_event_and_config(event, config);
  return build_subscription_row_from_draft({
    user,
    event,
    config: draft,
    app_roles,
    role_members,
    permission_members,
    departamento_names,
  });
}

export function build_user_subscription_summary(
  user: DepartmentUserOption,
  input: Omit<BuildUserSubscriptionSummariesInput, "usuarios">,
): UserSubscriptionSummary {
  const config_by_key = new Map(
    input.configs.map((config) => [
      `${config.app_slug}:${config.event_key}`,
      config,
    ]),
  );

  const relevant_events = input.active_events_only
    ? input.events.filter((event) => event.is_active)
    : input.events;

  const rows = relevant_events.map((event) =>
    build_user_subscription_row(
      user,
      event,
      config_by_key.get(`${event.app_slug}:${event.event_key}`) ?? null,
      input.app_roles,
      input.role_members,
      input.permission_members,
      input.departamento_names,
    ),
  );

  const inbox =
    user.id_auth && input.inbox_by_auth_id
      ? input.inbox_by_auth_id.get(user.id_auth)
      : undefined;
  const merged_rows = merge_inbox_into_subscription_rows(rows, inbox);

  const subscribed_rows = merged_rows.filter((row) => row.subscribed);
  const conditional_rows = merged_rows.filter((row) => row.conditional);

  const by_group_map = new Map<
    NotificationCatalogGroupId,
    UserSubscriptionGroupSummary
  >();

  for (const row of subscribed_rows) {
    const group_id = resolve_catalog_group(row);
    const meta = get_catalog_group_meta(group_id);
    const current = by_group_map.get(group_id) ?? {
      group_id,
      label: meta.label,
      count: 0,
      sample_titles: [],
    };
    current.count += 1;
    if (current.sample_titles.length < 3) {
      current.sample_titles.push(row.title);
    }
    by_group_map.set(group_id, current);
  }

  const by_group = NOTIFICATION_CATALOG_GROUPS.map((group) =>
    by_group_map.get(group.id),
  ).filter((entry): entry is UserSubscriptionGroupSummary => entry != null);

  return {
    total_subscribed: subscribed_rows.length,
    total_conditional: conditional_rows.length,
    total_inbox_events: inbox?.events.length ?? 0,
    total_active_events: relevant_events.length,
    by_group,
    rows: merged_rows,
  };
}

export function build_user_subscription_summaries(
  input: BuildUserSubscriptionSummariesInput,
): Map<number, UserSubscriptionSummary> {
  const summaries = new Map<number, UserSubscriptionSummary>();
  const shared = {
    events: input.events,
    configs: input.configs,
    app_roles: input.app_roles,
    role_members: input.role_members,
    permission_members: input.permission_members,
    departamento_names: input.departamento_names,
    inbox_by_auth_id: input.inbox_by_auth_id,
    active_events_only: input.active_events_only,
  };

  for (const user of input.usuarios) {
    summaries.set(
      user.id,
      build_user_subscription_summary(user, shared),
    );
  }
  return summaries;
}

export type UserSubscriptionCatalogGroupView = {
  group: NotificationCatalogGroupMeta;
  rows: UserEventSubscriptionRow[];
};

export function group_user_subscription_rows(
  rows: UserEventSubscriptionRow[],
): UserSubscriptionCatalogGroupView[] {
  const buckets = new Map<NotificationCatalogGroupId, UserEventSubscriptionRow[]>();
  for (const group of NOTIFICATION_CATALOG_GROUPS) {
    buckets.set(group.id, []);
  }

  for (const row of rows) {
    const group_id = resolve_catalog_group(row);
    buckets.get(group_id)?.push(row);
  }

  return NOTIFICATION_CATALOG_GROUPS.map((group) => ({
    group,
    rows: (buckets.get(group.id) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title, "es"),
    ),
  })).filter((entry) => entry.rows.length > 0);
}
