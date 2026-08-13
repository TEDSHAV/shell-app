export type DepartmentUserOption = {
  id: number;
  nombre: string;
  email: string | null;
  cargo: string | null;
  departamento_id: number | null;
  /** UUID auth; necesario para cruzar con notify.inbox */
  id_auth?: string | null;
};

export type AppRoleMember = {
  usuario_id: number;
  nombre: string;
  email: string | null;
  cargo: string | null;
  departamento_id: number | null;
};

export type AppRoleMembersByKey = Record<string, AppRoleMember[]>;

export type PermissionMember = {
  usuario_id: number;
  nombre: string;
  email: string | null;
  cargo: string | null;
  departamento_id: number | null;
  app_slug: string | null;
};

export type PermissionMembersByKey = Record<string, PermissionMember[]>;

export type AppRoleOption = {
  app_slug: string;
  app_nombre: string;
  role_slug: string;
  role_nombre: string;
};

export type DepartmentGroup = {
  departamento_id: number | null;
  departamento_nombre: string;
  usuarios: DepartmentUserOption[];
};

export type AppRoleGroup = {
  app_slug: string;
  app_nombre: string;
  roles: Array<{ role_slug: string; role_nombre: string }>;
};

export type TriState = "checked" | "unchecked" | "indeterminate";

export function to_app_role_key(app_slug: string, role_slug: string): string {
  return `${app_slug.trim().toLowerCase()}:${role_slug.trim().toLowerCase()}`;
}

export function group_users_by_department(
  usuarios: DepartmentUserOption[],
  departamento_names: Map<number, string>,
): DepartmentGroup[] {
  const groups = new Map<number | null, DepartmentGroup>();

  for (const usuario of usuarios) {
    const dept_id = usuario.departamento_id;
    if (!groups.has(dept_id)) {
      groups.set(dept_id, {
        departamento_id: dept_id,
        departamento_nombre:
          dept_id != null
            ? (departamento_names.get(dept_id) ?? `Departamento #${dept_id}`)
            : "Sin departamento",
        usuarios: [],
      });
    }
    groups.get(dept_id)?.usuarios.push(usuario);
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.departamento_nombre.localeCompare(b.departamento_nombre, "es"),
  );
}

export function group_app_roles(rows: AppRoleOption[]): AppRoleGroup[] {
  const groups = new Map<string, AppRoleGroup>();

  for (const row of rows) {
    if (!groups.has(row.app_slug)) {
      groups.set(row.app_slug, {
        app_slug: row.app_slug,
        app_nombre: row.app_nombre,
        roles: [],
      });
    }
    groups.get(row.app_slug)?.roles.push({
      role_slug: row.role_slug,
      role_nombre: row.role_nombre,
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.app_nombre.localeCompare(b.app_nombre, "es"),
  );
}

export function role_keys_to_slugs(keys: Set<string>): string[] {
  return Array.from(keys);
}

export function slugs_to_role_keys(slugs: string[]): Set<string> {
  return new Set(slugs.map((slug) => slug.trim().toLowerCase()));
}

export function get_app_tri_state(
  group: AppRoleGroup,
  selected_role_keys: Set<string>,
): TriState {
  const keys = group.roles.map((role) =>
    to_app_role_key(group.app_slug, role.role_slug),
  );
  const selected = keys.filter((key) => selected_role_keys.has(key));
  if (selected.length === 0) return "unchecked";
  if (selected.length === keys.length) return "checked";
  return "indeterminate";
}

export function toggle_app_selection(
  group: AppRoleGroup,
  selected_role_keys: Set<string>,
): Set<string> {
  const next = new Set(selected_role_keys);
  const tri = get_app_tri_state(group, selected_role_keys);
  const should_select = tri !== "checked";

  for (const role of group.roles) {
    const key = to_app_role_key(group.app_slug, role.role_slug);
    if (should_select) next.add(key);
    else next.delete(key);
  }

  return next;
}

export function toggle_role_selection(
  app_slug: string,
  role_slug: string,
  selected_role_keys: Set<string>,
): Set<string> {
  const next = new Set(selected_role_keys);
  const key = to_app_role_key(app_slug, role_slug);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function count_role_access(
  groups: AppRoleGroup[],
  selected_role_keys: Set<string>,
): { apps: number; roles: number } {
  let apps = 0;
  let roles = 0;
  for (const group of groups) {
    const keys = group.roles.map((role) =>
      to_app_role_key(group.app_slug, role.role_slug),
    );
    const selected = keys.filter((key) => selected_role_keys.has(key));
    if (selected.length > 0) apps += 1;
    roles += selected.length;
  }
  return { apps, roles };
}
