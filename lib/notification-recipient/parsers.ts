import { slugs_to_role_keys } from "@/lib/notification-recipient-selection";

import {
  parse_json_number_array,
  parse_json_object,
  parse_json_string_array,
} from "@/lib/notification-recipient/json-parsers";
import type {
  NotificationEventCatalogRow,
  NotificationRecipientConfigRow,
  RecipientConfigDraft,
} from "@/lib/notification-recipient/types";

export function parse_recipient_config_row(
  row: Record<string, unknown> | null | undefined,
): NotificationRecipientConfigRow | null {
  if (!row) return null;
  const app_slug = String(row.app_slug ?? "");
  const event_key = String(row.event_key ?? "");
  if (!app_slug || !event_key) return null;

  return {
    app_slug,
    event_key,
    allowed_role_slugs: parse_json_string_array(row.allowed_role_slugs),
    allowed_permission_slugs: parse_json_string_array(row.allowed_permission_slugs),
    allowed_departamento_ids: parse_json_number_array(row.allowed_departamento_ids),
    allowed_user_ids: parse_json_number_array(row.allowed_user_ids),
    denied_user_ids: parse_json_number_array(row.denied_user_ids),
    special_rules: parse_json_object(row.special_rules),
    notes: row.notes != null ? String(row.notes) : null,
  };
}

export function parse_event_catalog_row(
  row: Record<string, unknown>,
): NotificationEventCatalogRow | null {
  const app_slug = String(row.app_slug ?? "");
  const event_key = String(row.event_key ?? "");
  if (!app_slug || !event_key) return null;

  return {
    app_slug,
    event_key,
    title: row.title != null ? String(row.title) : null,
    description: row.description != null ? String(row.description) : null,
    trigger_kind: row.trigger_kind != null ? String(row.trigger_kind) : null,
    trigger_ref: row.trigger_ref != null ? String(row.trigger_ref) : null,
    is_active: row.is_active !== false,
    default_priority: Number(row.default_priority ?? 2),
    channel_mask: parse_json_object(row.channel_mask),
    available_special_rules: parse_json_string_array(row.available_special_rules),
  };
}

export function draft_from_event_and_config(
  event: NotificationEventCatalogRow,
  config: NotificationRecipientConfigRow | null,
): RecipientConfigDraft {
  return {
    title: event.title ?? event.event_key,
    description: event.description ?? "",
    trigger_kind: event.trigger_kind ?? "",
    trigger_ref: event.trigger_ref ?? "",
    is_active: event.is_active,
    allowed_departamento_ids: config?.allowed_departamento_ids ?? [],
    allowed_user_ids: config?.allowed_user_ids ?? [],
    denied_user_ids: config?.denied_user_ids ?? [],
    selected_role_keys: slugs_to_role_keys(config?.allowed_role_slugs ?? []),
    allowed_permission_slugs: config?.allowed_permission_slugs ?? [],
    special_rules: { ...(config?.special_rules ?? {}) },
    notes: config?.notes ?? "",
  };
}
