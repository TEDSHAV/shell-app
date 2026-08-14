import type {
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";

import {
  compute_user_access_snapshot,
  role_label_for_key,
} from "@/lib/notification-recipient/access-snapshot";
import { is_direct_target_only_event } from "@/lib/notification-recipient/special-rules";
import type {
  RecipientConfigDraft,
  UserAccessSnapshot,
  UserEventSubscriptionRow,
} from "@/lib/notification-recipient/types";

export function describe_user_subscription_conditions(
  snap: UserAccessSnapshot,
  _draft: RecipientConfigDraft,
  app_roles: AppRoleOption[],
): string[] {
  const labels: string[] = [];
  if (snap.manual) labels.push("Incluido manualmente");
  for (const role_key of snap.via_role_keys) {
    labels.push(`Rol: ${role_label_for_key(role_key, app_roles)}`);
  }
  for (const slug of snap.via_permission_slugs) {
    labels.push(`Permiso: ${slug}`);
  }
  if (snap.via_department) labels.push("Por departamento en catálogo");
  if (snap.excluded) labels.push("Excluido");
  for (const rule of snap.via_special_rules) {
    labels.push(rule);
  }

  if (labels.length === 0) labels.push("Sin motivo definido");
  return labels;
}

export function set_user_event_subscription(
  user: DepartmentUserOption,
  draft: RecipientConfigDraft,
  role_members: AppRoleMembersByKey,
  permission_members: PermissionMembersByKey,
  enabled: boolean,
): RecipientConfigDraft {
  if (enabled) {
    let next: RecipientConfigDraft = {
      ...draft,
      denied_user_ids: draft.denied_user_ids.filter((id) => id !== user.id),
    };
    const after_deny = compute_user_access_snapshot(
      user,
      next,
      role_members,
      permission_members,
    );
    if (!after_deny.has_access && !next.allowed_user_ids.includes(user.id)) {
      next = {
        ...next,
        allowed_user_ids: [...next.allowed_user_ids, user.id],
      };
    }
    return next;
  }

  let next: RecipientConfigDraft = {
    ...draft,
    allowed_user_ids: draft.allowed_user_ids.filter((id) => id !== user.id),
  };
  const after_remove = compute_user_access_snapshot(
    user,
    next,
    role_members,
    permission_members,
  );
  if (after_remove.has_access && !next.denied_user_ids.includes(user.id)) {
    next = {
      ...next,
      denied_user_ids: [...next.denied_user_ids, user.id],
    };
  }
  return next;
}

export type BuildUserSubscriptionRowInput = {
  user: DepartmentUserOption;
  event: {
    app_slug: string;
    event_key: string;
    title: string | null;
    description: string | null;
    is_active: boolean;
  };
  config: RecipientConfigDraft;
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  permission_members: PermissionMembersByKey;
  departamento_names?: Map<number, string>;
};

export function build_user_subscription_row(
  input: BuildUserSubscriptionRowInput,
): UserEventSubscriptionRow {
  const departamento_names = input.departamento_names ?? new Map();
  const snap = compute_user_access_snapshot(
    input.user,
    input.config,
    input.role_members,
    input.permission_members,
    departamento_names,
  );

  const direct_only = is_direct_target_only_event(input.config);
  const subscribed = direct_only ? snap.manual : snap.has_access;
  const conditional =
    !subscribed &&
    (snap.may_receive_contextually ||
      (direct_only && snap.contextual_rules_on_event.length > 0));

  const condition_labels = describe_user_subscription_conditions(
    snap,
    input.config,
    input.app_roles,
  );

  if (!subscribed) {
    if (snap.contextual_rules_on_event.length > 0) {
      condition_labels.length = 0;
      condition_labels.push(...snap.contextual_rules_on_event);
    } else if (direct_only) {
      condition_labels.length = 0;
      condition_labels.push("Solo cuando participa en el evento");
    }
  }

  return {
    app_slug: input.event.app_slug,
    event_key: input.event.event_key,
    title: input.event.title ?? input.event.event_key,
    description: input.event.description,
    is_active: input.event.is_active,
    subscribed,
    conditional,
    condition_labels,
  };
}
