import type {
  AppRoleMembersByKey,
  AppRoleOption,
  DepartmentUserOption,
  PermissionMembersByKey,
} from "@/lib/notification-recipient-selection";

import type {
  EffectiveAccessSummary,
  RecipientConfigDraft,
  UserAccessSnapshot,
} from "@/lib/notification-recipient/types";

import {
  compute_user_access_snapshot,
  role_label_for_key,
} from "@/lib/notification-recipient/access-snapshot";
import { count_active_special_rules, get_active_contextual_rule_labels } from "@/lib/notification-recipient/special-rules";

export function build_effective_access_summary(args: {
  usuarios: DepartmentUserOption[];
  departamento_names: Map<number, string>;
  app_roles: AppRoleOption[];
  role_members: AppRoleMembersByKey;
  permission_members?: PermissionMembersByKey;
  draft: RecipientConfigDraft;
}): EffectiveAccessSummary {
  const {
    usuarios,
    departamento_names,
    app_roles,
    role_members,
    permission_members = {},
    draft,
  } = args;

  const snapshots = new Map<number, UserAccessSnapshot>();
  const by_role = new Map<string, number>();
  const by_permission = new Map<string, number>();
  const by_department = new Map<number, number>();
  const by_special = new Map<string, number>();
  const manual_users: EffectiveAccessSummary["manual_users"] = [];
  const excluded_users: EffectiveAccessSummary["excluded_users"] = [];

  for (const user of usuarios) {
    const snap = compute_user_access_snapshot(
      user,
      draft,
      role_members,
      permission_members,
      departamento_names,
    );
    snapshots.set(user.id, snap);
    if (!snap.has_access) {
      if (snap.excluded) {
        excluded_users.push({
          user_id: user.id,
          nombre: user.nombre,
          via_role_keys: snap.via_role_keys,
        });
      }
      continue;
    }

    for (const role_key of snap.via_role_keys) {
        by_role.set(role_key, (by_role.get(role_key) ?? 0) + 1);
      }
      for (const permission_slug of snap.via_permission_slugs) {
        by_permission.set(
          permission_slug,
          (by_permission.get(permission_slug) ?? 0) + 1,
        );
      }
      if (snap.via_department && user.departamento_id != null) {
        by_department.set(
          user.departamento_id,
          (by_department.get(user.departamento_id) ?? 0) + 1,
        );
      }
      if (snap.manual) {
        manual_users.push({ user_id: user.id, nombre: user.nombre });
      }

    for (const rule_label of snap.via_special_rules) {
      by_special.set(rule_label, (by_special.get(rule_label) ?? 0) + 1);
    }
  }

  return {
    total: Array.from(snapshots.values()).filter((snap) => snap.has_access).length,
    contextual_rule_labels: get_active_contextual_rule_labels(draft.special_rules),
    by_role: Array.from(by_role.entries()).map(([role_key, count]) => ({
      role_key,
      role_label: role_label_for_key(role_key, app_roles),
      count,
    })),
    by_permission: Array.from(by_permission.entries()).map(
      ([permission_slug, count]) => ({
        permission_slug,
        count,
      }),
    ),
    by_department: Array.from(by_department.entries()).map(
      ([departamento_id, count]) => ({
        departamento_id,
        nombre:
          departamento_names.get(departamento_id) ??
          `Departamento #${departamento_id}`,
        count,
      }),
    ),
    by_special: Array.from(by_special.entries()).map(([rule_label, count]) => ({
      rule_label,
      count,
    })),
    manual_users,
    excluded_users,
    snapshots,
    permission_count: draft.allowed_permission_slugs.length,
    special_rule_count: count_active_special_rules(draft.special_rules),
  };
}
