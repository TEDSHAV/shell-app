"use server";

import { revalidatePath } from "next/cache";

import { assertCanManageNotificationAdmin } from "@/actions/notification-admin-access";
import {
  draft_from_event_and_config,
  parse_event_catalog_row,
  parse_recipient_config_row,
  set_user_event_subscription,
  describe_user_subscription_conditions,
  compute_user_access_snapshot,
  type NotificationEventCatalogRow,
  type NotificationRecipientConfigRow,
  type RecipientConfigDraft,
  type UserEventSubscriptionRow,
} from "@/lib/notification-recipient-config";
import type {
  AppRoleMember,
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
} from "@/lib/notification-recipient-selection";
import { to_app_role_key, role_keys_to_slugs } from "@/lib/notification-recipient-selection";
import type {
  PermissionMember,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";
import { NOTIFY_ADMIN_BASE } from "@/lib/notification-admin-paths";
import {
  aggregate_inbox_rows,
  inbox_lookback_iso,
  type InboxSummariesByAuthId,
} from "@/lib/notification-recipient/inbox-summary";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const update_schema = {
  parse(input: NotificationAdminUpdateInput): NotificationAdminUpdateInput {
    if (!input.app_slug?.trim() || !input.event_key?.trim()) {
      throw new Error("app_slug y event_key son obligatorios.");
    }
    if (!input.title?.trim()) {
      throw new Error("El título es obligatorio.");
    }
    return {
      app_slug: input.app_slug.trim(),
      event_key: input.event_key.trim(),
      title: input.title.trim(),
      description: input.description ?? "",
      trigger_kind: input.trigger_kind ?? "",
      trigger_ref: input.trigger_ref ?? "",
      is_active: Boolean(input.is_active),
      allowed_role_slugs: input.allowed_role_slugs ?? [],
      allowed_permission_slugs: input.allowed_permission_slugs ?? [],
      allowed_departamento_ids: input.allowed_departamento_ids ?? [],
      allowed_user_ids: input.allowed_user_ids ?? [],
      denied_user_ids: input.denied_user_ids ?? [],
      special_rules: input.special_rules ?? {},
      notes: input.notes ?? "",
    };
  },
};

export type NotificationAdminUpdateInput = {
  app_slug: string;
  event_key: string;
  title: string;
  description: string;
  trigger_kind: string;
  trigger_ref: string;
  is_active: boolean;
  allowed_role_slugs: string[];
  allowed_permission_slugs: string[];
  allowed_departamento_ids: number[];
  allowed_user_ids: number[];
  denied_user_ids: number[];
  special_rules: Record<string, unknown>;
  notes: string;
};

export type NotificationEventListItem = NotificationEventCatalogRow & {
  has_config: boolean;
};

async function get_current_auth_id(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function listNotificationEvents(): Promise<
  NotificationEventListItem[]
> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data: events, error } = await supabase
    .schema("notify")
    .from("event_types")
    .select(
      "app_slug,event_key,title,description,trigger_kind,trigger_ref,is_active,default_priority,channel_mask,available_special_rules",
    )
    .order("app_slug", { ascending: true })
    .order("event_key", { ascending: true });

  if (error || !Array.isArray(events)) {
    console.error("[listNotificationEvents]", error);
    return [];
  }

  const { data: configs } = await supabase
    .schema("notify")
    .from("event_recipient_config")
    .select("app_slug,event_key");

  const config_keys = new Set(
    (configs ?? []).map(
      (row) => `${String(row.app_slug)}:${String(row.event_key)}`,
    ),
  );

  return events
    .map((row) => parse_event_catalog_row(row as Record<string, unknown>))
    .filter((row): row is NotificationEventCatalogRow => row !== null)
    .map((row) => ({
      ...row,
      has_config: config_keys.has(`${row.app_slug}:${row.event_key}`),
    }));
}

export async function getNotificationEventDetail(
  app_slug: string,
  event_key: string,
): Promise<{
  event: NotificationEventCatalogRow | null;
  config: NotificationRecipientConfigRow | null;
}> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data: event_row, error: event_error } = await supabase
    .schema("notify")
    .from("event_types")
    .select(
      "app_slug,event_key,title,description,trigger_kind,trigger_ref,is_active,default_priority,channel_mask,available_special_rules",
    )
    .eq("app_slug", app_slug)
    .eq("event_key", event_key)
    .maybeSingle();

  if (event_error) {
    console.error("[getNotificationEventDetail] event:", event_error);
    return { event: null, config: null };
  }

  const { data: config_row, error: config_error } = await supabase
    .schema("notify")
    .from("event_recipient_config")
    .select("*")
    .eq("app_slug", app_slug)
    .eq("event_key", event_key)
    .maybeSingle();

  if (config_error) {
    console.error("[getNotificationEventDetail] config:", config_error);
  }

  return {
    event: parse_event_catalog_row(
      (event_row ?? {}) as Record<string, unknown>,
    ),
    config: parse_recipient_config_row(
      (config_row ?? null) as Record<string, unknown> | null,
    ),
  };
}

function map_app_role_rows(
  rows: Array<Record<string, unknown>>,
): AppRoleOption[] {
  return rows
    .map((row) => ({
      app_slug: String(row.app_slug ?? ""),
      app_nombre: String(row.app_nombre ?? row.app_slug ?? ""),
      role_slug: String(row.role_slug ?? ""),
      role_nombre: String(row.role_nombre ?? row.role_slug ?? ""),
    }))
    .filter((row) => row.app_slug.length > 0 && row.role_slug.length > 0);
}

export async function listNotificationAppRoles(): Promise<AppRoleOption[]> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data: view_rows, error: view_error } = await supabase
    .from("v_osi_app_roles_catalog")
    .select("app_slug,app_nombre,role_slug,role_nombre")
    .order("app_nombre", { ascending: true })
    .order("role_nombre", { ascending: true });

  if (!view_error && Array.isArray(view_rows) && view_rows.length > 0) {
    return map_app_role_rows(view_rows as Array<Record<string, unknown>>);
  }

  if (view_error) {
    console.warn("[listNotificationAppRoles] view:", view_error.message);
  }

  const { data: rpc_rows, error: rpc_error } = await supabase.rpc(
    "fn_osi_list_app_roles",
  );

  if (rpc_error || !Array.isArray(rpc_rows)) {
    console.error("[listNotificationAppRoles] rpc:", rpc_error);
    return [];
  }

  return map_app_role_rows(rpc_rows as Array<Record<string, unknown>>);
}

export async function listNotificationUsers(): Promise<DepartmentUserOption[]> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data: usuario_rows, error: usuario_error } = await supabase
    .from("usuarios")
    .select("id,nombre_apellido,email_corporativo,departamento,esta_activo,id_auth")
    .not("id_auth", "is", null)
    .or("esta_activo.is.null,esta_activo.eq.true")
    .order("nombre_apellido", { ascending: true });

  if (usuario_error || !Array.isArray(usuario_rows)) {
    console.error("[listNotificationUsers]", usuario_error);
    return [];
  }

  const { data: puesto_rows, error: puesto_error } = await supabase
    .from("puestos_empleados")
    .select("id_empleado,cargo");

  if (puesto_error) {
    console.warn("[listNotificationUsers] puestos:", puesto_error.message);
  }

  const cargo_by_user = new Map<number, string>();
  for (const row of puesto_rows ?? []) {
    const id = Number((row as { id_empleado?: number }).id_empleado ?? 0);
    const cargo = String((row as { cargo?: string | null }).cargo ?? "").trim();
    if (id > 0 && cargo) cargo_by_user.set(id, cargo);
  }

  return (usuario_rows as Array<Record<string, unknown>>)
    .map((row) => {
      const id = Number(row.id ?? 0);
      const departamento_id = Number(row.departamento ?? 0);
      const id_auth_raw = row.id_auth;
      return {
        id,
        nombre: String(row.nombre_apellido ?? ""),
        email: String(row.email_corporativo ?? "") || null,
        cargo: cargo_by_user.get(id) ?? null,
        departamento_id:
          Number.isFinite(departamento_id) && departamento_id > 0
            ? departamento_id
            : null,
        id_auth:
          typeof id_auth_raw === "string" && id_auth_raw.length > 0
            ? id_auth_raw
            : null,
      };
    })
    .filter((user) => user.id > 0 && user.nombre);
}

export async function listNotificationAppRoleMembers(): Promise<AppRoleMembersByKey> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("v_osi_app_role_members")
    .select(
      "app_slug,role_slug,usuario_id,nombre_apellido,email_corporativo,cargo,departamento_id",
    )
    .order("nombre_apellido", { ascending: true });

  if (error || !Array.isArray(data)) {
    console.error("[listNotificationAppRoleMembers]", error);
    return {};
  }

  const out: AppRoleMembersByKey = {};
  const seen = new Set<string>();

  for (const row of data as Array<Record<string, unknown>>) {
    const app_slug = String(row.app_slug ?? "");
    const role_slug = String(row.role_slug ?? "");
    if (!app_slug || !role_slug) continue;

    const key = to_app_role_key(app_slug, role_slug);
    const usuario_id = Number(row.usuario_id ?? 0);
    if (usuario_id <= 0) continue;

    const dedupe_key = `${key}:${usuario_id}`;
    if (seen.has(dedupe_key)) continue;
    seen.add(dedupe_key);

    const member: AppRoleMember = {
      usuario_id,
      nombre: String(row.nombre_apellido ?? ""),
      email: String(row.email_corporativo ?? "") || null,
      cargo: String(row.cargo ?? "").trim() || null,
      departamento_id: Number(row.departamento_id ?? 0) || null,
    };
    if (!member.nombre) continue;

    if (!out[key]) out[key] = [];
    out[key].push(member);
  }

  return out;
}

export type PermissionOption = {
  slug: string;
  descripcion: string | null;
};

export async function listNotificationPermissions(): Promise<PermissionOption[]> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("v_notify_permissions_catalog")
    .select("slug,descripcion")
    .order("slug", { ascending: true });

  if (error || !Array.isArray(data)) {
    console.error("[listNotificationPermissions]", error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => ({
    slug: String(row.slug ?? ""),
    descripcion: row.descripcion != null ? String(row.descripcion) : null,
  }));
}

export async function listNotificationPermissionMembers(): Promise<PermissionMembersByKey> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("v_notify_permission_members")
    .select(
      "permission_slug,usuario_id,nombre_apellido,email_corporativo,cargo,departamento_id,app_slug",
    )
    .order("nombre_apellido", { ascending: true });

  if (error || !Array.isArray(data)) {
    console.error("[listNotificationPermissionMembers]", error);
    return {};
  }

  const out: PermissionMembersByKey = {};
  const seen = new Set<string>();

  for (const row of data as Array<Record<string, unknown>>) {
    const permission_slug = String(row.permission_slug ?? "");
    const usuario_id = Number(row.usuario_id ?? 0);
    if (!permission_slug || usuario_id <= 0) continue;

    const dedupe_key = `${permission_slug}:${usuario_id}`;
    if (seen.has(dedupe_key)) continue;
    seen.add(dedupe_key);

    const member: PermissionMember = {
      usuario_id,
      nombre: String(row.nombre_apellido ?? ""),
      email: String(row.email_corporativo ?? "") || null,
      cargo: String(row.cargo ?? "").trim() || null,
      departamento_id: Number(row.departamento_id ?? 0) || null,
      app_slug: row.app_slug != null ? String(row.app_slug) : null,
    };
    if (!member.nombre) continue;

    if (!out[permission_slug]) out[permission_slug] = [];
    out[permission_slug].push(member);
  }

  return out;
}

function revalidate_notification_paths(app_slug?: string, event_key?: string) {
  revalidatePath(NOTIFY_ADMIN_BASE);
  revalidatePath(`${NOTIFY_ADMIN_BASE}/usuarios`);
  if (app_slug && event_key) {
    revalidatePath(`${NOTIFY_ADMIN_BASE}/${app_slug}/${event_key}`);
  }
}

export async function listNotificationInboxSummaries(): Promise<InboxSummariesByAuthId> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .schema("notify")
    .from("inbox")
    .select("recipient_id_auth,app_slug,event_key,title,created_at")
    .gte("created_at", inbox_lookback_iso())
    .order("created_at", { ascending: false })
    .limit(25000);

  if (error || !Array.isArray(data)) {
    console.error("[listNotificationInboxSummaries]", error);
    return new Map();
  }

  return aggregate_inbox_rows(
    (data as Array<Record<string, unknown>>).map((row) => ({
      recipient_id_auth: String(row.recipient_id_auth ?? ""),
      app_slug: String(row.app_slug ?? ""),
      event_key: String(row.event_key ?? ""),
      title: String(row.title ?? ""),
      created_at: String(row.created_at ?? ""),
    })),
  );
}

export async function listAllNotificationRecipientConfigs(): Promise<
  NotificationRecipientConfigRow[]
> {
  await assertCanManageNotificationAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .schema("notify")
    .from("event_recipient_config")
    .select("*");

  if (error || !Array.isArray(data)) {
    console.error("[listAllNotificationRecipientConfigs]", error);
    return [];
  }

  return data
    .map((row) => parse_recipient_config_row(row as Record<string, unknown>))
    .filter((row): row is NotificationRecipientConfigRow => row !== null);
}

export async function setUserEventSubscription(input: {
  usuario_id: number;
  app_slug: string;
  event_key: string;
  enabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await assertCanManageNotificationAdmin();
    const supabase = await createAdminClient();

    const [detail, users, role_members, permission_members] = await Promise.all([
      getNotificationEventDetail(input.app_slug, input.event_key),
      listNotificationUsers(),
      listNotificationAppRoleMembers(),
      listNotificationPermissionMembers(),
    ]);

    if (!detail.event) {
      return { success: false, error: "Evento no encontrado" };
    }

    const user = users.find((u) => u.id === input.usuario_id);
    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const draft = draft_from_event_and_config(detail.event, detail.config);
    const next_draft = set_user_event_subscription(
      user,
      draft,
      role_members,
      permission_members,
      input.enabled,
    );

    const updated_by = await get_current_auth_id();
    const now = new Date().toISOString();

    const { error } = await supabase
      .schema("notify")
      .from("event_recipient_config")
      .upsert({
        app_slug: input.app_slug,
        event_key: input.event_key,
        allowed_role_slugs: role_keys_to_slugs(next_draft.selected_role_keys),
        allowed_permission_slugs: next_draft.allowed_permission_slugs,
        allowed_departamento_ids: next_draft.allowed_departamento_ids,
        allowed_user_ids: next_draft.allowed_user_ids,
        denied_user_ids: next_draft.denied_user_ids,
        special_rules: next_draft.special_rules,
        notes: next_draft.notes || null,
        updated_at: now,
        updated_by,
      });

    if (error) {
      console.error("[setUserEventSubscription]", error);
      return { success: false, error: "No se pudo actualizar la suscripción" };
    }

    revalidate_notification_paths(input.app_slug, input.event_key);
    revalidatePath(`${NOTIFY_ADMIN_BASE}/usuarios/${input.usuario_id}`);
    return { success: true };
  } catch (err) {
    console.error("[setUserEventSubscription]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

export async function updateNotificationEventConfig(
  input: NotificationAdminUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertCanManageNotificationAdmin();
    const parsed = update_schema.parse(input);
    const supabase = await createAdminClient();
    const updated_by = await get_current_auth_id();
    const now = new Date().toISOString();

    const { error: event_error } = await supabase
      .schema("notify")
      .from("event_types")
      .update({
        title: parsed.title,
        description: parsed.description || null,
        trigger_kind: parsed.trigger_kind || null,
        trigger_ref: parsed.trigger_ref || null,
        is_active: parsed.is_active,
        updated_at: now,
      })
      .eq("app_slug", parsed.app_slug)
      .eq("event_key", parsed.event_key);

    if (event_error) {
      console.error("[updateNotificationEventConfig] event:", event_error);
      return {
        success: false,
        error: "No se pudo actualizar el catálogo del evento",
      };
    }

    const { error: config_error } = await supabase
      .schema("notify")
      .from("event_recipient_config")
      .upsert({
        app_slug: parsed.app_slug,
        event_key: parsed.event_key,
        allowed_role_slugs: parsed.allowed_role_slugs,
        allowed_permission_slugs: parsed.allowed_permission_slugs,
        allowed_departamento_ids: parsed.allowed_departamento_ids,
        allowed_user_ids: parsed.allowed_user_ids,
        denied_user_ids: parsed.denied_user_ids,
        special_rules: parsed.special_rules,
        notes: parsed.notes || null,
        updated_at: now,
        updated_by,
      });

    if (config_error) {
      console.error("[updateNotificationEventConfig] config:", config_error);
      return {
        success: false,
        error: "No se pudo guardar la configuración de destinatarios",
      };
    }

    revalidate_notification_paths(parsed.app_slug, parsed.event_key);
    return { success: true };
  } catch (err) {
    console.error("[updateNotificationEventConfig]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
