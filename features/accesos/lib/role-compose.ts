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
 * Roles that already shared permissions with this role *before* the edit.
 * Used to offer optional delta sync — not when composing by pasting other roles.
 */
export function find_overlapping_roles(args: {
  app_id: number;
  exclude_role_id: number | null;
  exclude_role_ids?: number[];
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  /** Only the set the role had before saving. Empty → no peers. */
  before_ids: number[];
}): AccesoRole[] {
  if (args.before_ids.length === 0) return [];

  const id_to_slug = new Map(args.permissions.map((p) => [p.id, p.slug]));
  const probe_slugs = new Set(
    args.before_ids
      .map((id) => id_to_slug.get(id))
      .filter((slug): slug is string => Boolean(slug)),
  );
  if (probe_slugs.size === 0) return [];

  const excluded = new Set<number>(args.exclude_role_ids || []);
  if (args.exclude_role_id != null) excluded.add(args.exclude_role_id);

  return args.roles.filter((role) => {
    if (role.app_id !== args.app_id) return false;
    if (excluded.has(role.id)) return false;
    return role.permission_slugs.some((slug) => probe_slugs.has(slug));
  });
}
