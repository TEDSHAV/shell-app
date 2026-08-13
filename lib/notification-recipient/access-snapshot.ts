import type {
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";

import { evaluate_special_rules_for_user } from "@/lib/notification-recipient/special-rules";
import type {
  RecipientConfigDraft,
  UserAccessBadge,
  UserAccessSnapshot,
} from "@/lib/notification-recipient/types";

export function role_label_for_key(
  role_key: string,
  app_roles: AppRoleOption[],
): string {
  const [app_slug, role_slug] = role_key.split(":");
  const match = app_roles.find(
    (row) => row.app_slug === app_slug && row.role_slug === role_slug,
  );
  if (!match) return role_key;
  return `${match.app_nombre} · ${match.role_nombre}`;
}

export function get_user_role_keys(
  user_id: number,
  selected_role_keys: Set<string>,
  role_members: AppRoleMembersByKey,
): string[] {
  const keys: string[] = [];
  for (const role_key of selected_role_keys) {
    const members = role_members[role_key] ?? [];
    if (members.some((member) => member.usuario_id === user_id)) {
      keys.push(role_key);
    }
  }
  return keys;
}

export function get_user_permission_slugs(
  user_id: number,
  allowed_permission_slugs: string[],
  permission_members: PermissionMembersByKey,
): string[] {
  return allowed_permission_slugs.filter((slug) =>
    (permission_members[slug] ?? []).some(
      (member) => member.usuario_id === user_id,
    ),
  );
}

export function compute_user_access_snapshot(
  user: DepartmentUserOption,
  draft: RecipientConfigDraft,
  role_members: AppRoleMembersByKey,
  permission_members: PermissionMembersByKey = {},
  departamento_names: Map<number, string> = new Map(),
): UserAccessSnapshot {
  const via_role_keys = get_user_role_keys(
    user.id,
    draft.selected_role_keys,
    role_members,
  );
  const via_permission_slugs = get_user_permission_slugs(
    user.id,
    draft.allowed_permission_slugs,
    permission_members,
  );
  const via_department =
    user.departamento_id != null &&
    draft.allowed_departamento_ids.includes(user.departamento_id);
  const manual = draft.allowed_user_ids.includes(user.id);
  const excluded = draft.denied_user_ids.includes(user.id);

  const special = evaluate_special_rules_for_user(
    user,
    draft,
    role_members,
    departamento_names,
  );

  const role_grant = via_role_keys.length > 0;
  const permission_grant = via_permission_slugs.length > 0;
  const dept_grant = via_department;
  const static_grant = role_grant || permission_grant || dept_grant;
  const special_grant = special.broadcast_grant;

  const has_access =
    manual || (!excluded && (static_grant || special_grant));

  const may_receive_contextually =
    !has_access && special.contextual_rules_active.length > 0;

  const badges: UserAccessBadge[] = [];
  if (excluded && (static_grant || special_grant) && !manual) {
    badges.push("excluded");
  } else if (has_access) {
    if (manual) badges.push("manual");
    if (role_grant) badges.push("role");
    if (permission_grant) badges.push("permission");
    if (dept_grant) badges.push("department");
    if (special_grant) badges.push("special");
  } else {
    badges.push("none");
  }

  return {
    user_id: user.id,
    has_access,
    may_receive_contextually,
    badges,
    via_role_keys,
    via_permission_slugs,
    via_department,
    via_special_rules: special.via_special_rules,
    manual,
    excluded: excluded && !manual,
    contextual_rules_on_event: special.contextual_rules_active,
  };
}
