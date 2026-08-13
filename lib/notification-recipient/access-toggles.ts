import type {
  AppRoleMembersByKey,
  DepartmentGroup,
  DepartmentUserOption,
  PermissionMembersByKey,
  TriState,
} from "@/lib/notification-recipient-selection";

import { compute_user_access_snapshot } from "@/lib/notification-recipient/access-snapshot";
import type {
  RecipientConfigDraft,
  UserAccessSnapshot,
} from "@/lib/notification-recipient/types";

export function get_department_effective_tri_state(
  group: DepartmentGroup,
  snapshots: Map<number, UserAccessSnapshot>,
): TriState {
  const users_with_access = group.usuarios.filter(
    (user) => snapshots.get(user.id)?.has_access,
  );
  if (users_with_access.length === 0) return "unchecked";
  if (users_with_access.length === group.usuarios.length) return "checked";
  return "indeterminate";
}

export function toggle_department_access(
  group: DepartmentGroup,
  draft: RecipientConfigDraft,
  snapshots: Map<number, UserAccessSnapshot>,
): RecipientConfigDraft {
  const tri = get_department_effective_tri_state(group, snapshots);
  const should_grant = tri !== "checked";
  const dept_id = group.departamento_id;

  let allowed_departamento_ids = [...draft.allowed_departamento_ids];
  if (dept_id != null) {
    if (should_grant) {
      if (!allowed_departamento_ids.includes(dept_id)) {
        allowed_departamento_ids.push(dept_id);
      }
    } else {
      allowed_departamento_ids = allowed_departamento_ids.filter(
        (id) => id !== dept_id,
      );
    }
  } else if (should_grant) {
    for (const user of group.usuarios) {
      if (!draft.allowed_user_ids.includes(user.id)) {
        draft = {
          ...draft,
          allowed_user_ids: [...draft.allowed_user_ids, user.id],
        };
      }
    }
    return draft;
  }

  return { ...draft, allowed_departamento_ids };
}

export function toggle_user_access(
  user: DepartmentUserOption,
  draft: RecipientConfigDraft,
  role_members: AppRoleMembersByKey,
  permission_members: PermissionMembersByKey = {},
): RecipientConfigDraft {
  const snap = compute_user_access_snapshot(
    user,
    draft,
    role_members,
    permission_members,
  );
  const has_implicit =
    snap.via_role_keys.length > 0 ||
    snap.via_permission_slugs.length > 0 ||
    snap.via_department ||
    snap.manual;

  if (snap.manual) {
    return {
      ...draft,
      allowed_user_ids: draft.allowed_user_ids.filter((id) => id !== user.id),
    };
  }

  if (
    snap.via_role_keys.length > 0 ||
    snap.via_permission_slugs.length > 0 ||
    snap.via_department
  ) {
    if (snap.excluded) {
      return {
        ...draft,
        denied_user_ids: draft.denied_user_ids.filter((id) => id !== user.id),
      };
    }
    return {
      ...draft,
      denied_user_ids: [...draft.denied_user_ids, user.id],
    };
  }

  if (!has_implicit) {
    return {
      ...draft,
      allowed_user_ids: [...draft.allowed_user_ids, user.id],
    };
  }

  return draft;
}
