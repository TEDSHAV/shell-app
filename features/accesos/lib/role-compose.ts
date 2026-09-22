import type { AccesoPermission, AccesoRole } from "./types";

/** Resolve permission ids currently hanging on a role. */
export function role_permission_ids(
  role: AccesoRole,
  permissions: AccesoPermission[],
): number[] {
  const slug_set = new Set(role.permission_slugs);
  return permissions.filter((p) => slug_set.has(p.slug)).map((p) => p.id);
}

export function permission_delta(
  before: number[],
  after: number[],
): { added: number[]; removed: number[] } {
  const before_set = new Set(before);
  const after_set = new Set(after);
  return {
    added: after.filter((id) => !before_set.has(id)),
    removed: before.filter((id) => !after_set.has(id)),
  };
}

export function merge_permission_ids(
  current: number[],
  incoming: number[],
): number[] {
  const next = new Set(current);
  for (const id of incoming) next.add(id);
  return [...next];
}

export function apply_delta_to_ids(
  current: number[],
  added: number[],
  removed: number[],
): number[] {
  const next = new Set(current);
  for (const id of removed) next.delete(id);
  for (const id of added) next.add(id);
  return [...next];
}

/**
 * Other roles in the same app that share at least one permission with
 * the edited set (before ∪ after). Pure coincidence check — no role graph.
 */
export function find_overlapping_roles(args: {
  app_id: number;
  exclude_role_id: number | null;
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  before_ids: number[];
  after_ids: number[];
}): AccesoRole[] {
  const probe = new Set([...args.before_ids, ...args.after_ids]);
  if (probe.size === 0) return [];

  const id_to_slug = new Map(args.permissions.map((p) => [p.id, p.slug]));
  const probe_slugs = new Set(
    [...probe]
      .map((id) => id_to_slug.get(id))
      .filter((slug): slug is string => Boolean(slug)),
  );

  return args.roles.filter((role) => {
    if (role.app_id !== args.app_id) return false;
    if (args.exclude_role_id != null && role.id === args.exclude_role_id) {
      return false;
    }
    return role.permission_slugs.some((slug) => probe_slugs.has(slug));
  });
}
