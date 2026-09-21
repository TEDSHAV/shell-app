"use server";

import { require_ted_accesos, num } from "./assert-ted";
import { ACTION_CATALOG, MODULE_HOME_APP, MODULE_LABELS } from "../lib/slugs";
import type {
  AccesoAction,
  AccesoApp,
  AccesoCatalog,
  AccesoModule,
  AccesoPermission,
  AccesoRole,
  AccesoUsuarioAssignment,
  AccesoUsuarioFicha,
  AccesoUsuarioListItem,
} from "../lib/types";

export async function load_acceso_catalog(): Promise<AccesoCatalog> {
  const supabase = await require_ted_accesos();
  const auth = supabase.schema("authprisma");

  const [appsRes, rolesRes, permsRes, uarRes, usersRes, deptsRes, rpRes, modulesRes, actionsRes] =
    await Promise.all([
      auth.from("apps").select("id, slug, nombre, descripcion").order("nombre"),
      auth
        .from("roles")
        .select("id, app_id, slug, nombre, descripcion")
        .order("nombre"),
      auth.from("permissions").select("id, slug, descripcion").order("slug"),
      auth.from("user_app_roles").select("usuario_id, app_id, role_id"),
      supabase
        .from("usuarios")
        .select(
          "id, nombre_apellido, email_corporativo, cargo, esta_activo, departamento",
        )
        .order("nombre_apellido"),
      supabase.from("departamentos").select("id, nombre"),
      auth.from("role_permissions").select("role_id, permission_id"),
      auth
        .from("permission_modules")
        .select("slug, nombre, descripcion, app_id")
        .order("nombre"),
      auth
        .from("permission_actions")
        .select("slug, nombre, descripcion")
        .order("slug"),
    ]);

  if (appsRes.error) throw new Error(appsRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);
  if (permsRes.error) throw new Error(permsRes.error.message);
  if (uarRes.error) throw new Error(uarRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (rpRes.error) throw new Error(rpRes.error.message);

  const dept_names = new Map<number, string>(
    ((deptsRes.data || []) as Array<{ id: number; nombre: string }>).map(
      (d) => [d.id, d.nombre],
    ),
  );

  const perm_slug_by_id = new Map<number, string>(
    (
      (permsRes.data || []) as Array<{ id: number; slug: string }>
    ).map((p) => [num(p.id), p.slug]),
  );
  const perms_by_role = new Map<number, string[]>();
  for (const row of (rpRes.data || []) as Array<{
    role_id: number;
    permission_id: number;
  }>) {
    const rid = num(row.role_id);
    const slug = perm_slug_by_id.get(num(row.permission_id));
    if (!slug) continue;
    const list = perms_by_role.get(rid) || [];
    list.push(slug);
    perms_by_role.set(rid, list);
  }

  const uar = (uarRes.data || []) as Array<{
    usuario_id: number;
    app_id: number;
    role_id: number;
  }>;
  const users_by_role = new Map<number, number[]>();
  const labels_by_id = new Map<number, string>(
    (
      (usersRes.data || []) as Array<{
        id: number;
        nombre_apellido: string;
      }>
    ).map((u) => [u.id, u.nombre_apellido]),
  );
  for (const row of uar) {
    const list = users_by_role.get(row.role_id) || [];
    list.push(row.usuario_id);
    users_by_role.set(row.role_id, list);
  }

  const apps: AccesoApp[] = (
    (appsRes.data || []) as Array<{
      id: number;
      slug: string;
      nombre: string;
      descripcion: string | null;
    }>
  ).map((a) => {
    const app_id = num(a.id);
    const role_count = (
      (rolesRes.data || []) as Array<{ app_id: number }>
    ).filter((r) => num(r.app_id) === app_id).length;
    const user_count = new Set(
      uar.filter((row) => num(row.app_id) === app_id).map((row) => row.usuario_id),
    ).size;
    return {
      id: app_id,
      slug: a.slug,
      nombre: a.nombre,
      descripcion: a.descripcion,
      role_count,
      user_count,
    };
  });

  const roles: AccesoRole[] = (
    (rolesRes.data || []) as Array<{
      id: number;
      app_id: number;
      slug: string;
      nombre: string;
      descripcion: string | null;
    }>
  ).map((r) => {
    const id = num(r.id);
    const user_ids = users_by_role.get(id) || [];
    return {
      id,
      app_id: num(r.app_id),
      slug: r.slug,
      nombre: r.nombre,
      descripcion: r.descripcion,
      permission_slugs: perms_by_role.get(id) || [],
      user_ids,
      user_labels: user_ids
        .map((uid) => labels_by_id.get(uid) || `#${uid}`)
        .slice(0, 8),
    };
  });

  const permissions: AccesoPermission[] = (
    (permsRes.data || []) as Array<{
      id: number;
      slug: string;
      descripcion: string | null;
    }>
  ).map((p) => ({
    id: num(p.id),
    slug: p.slug,
    descripcion: p.descripcion,
  }));

  const app_count_by_user = new Map<number, number>();
  for (const row of uar) {
    app_count_by_user.set(
      row.usuario_id,
      (app_count_by_user.get(row.usuario_id) || 0) + 1,
    );
  }

  const assignments_by_user = new Map<number, AccesoUsuarioAssignment[]>();
  for (const row of uar) {
    const app = apps.find((a) => a.id === num(row.app_id));
    const role = roles.find((r) => r.id === num(row.role_id));
    if (!app || !role) continue;
    const list = assignments_by_user.get(row.usuario_id) || [];
    list.push({
      app_id: app.id,
      app_slug: app.slug,
      app_nombre: app.nombre,
      role_nombre: role.nombre,
      role_slug: role.slug,
      role_descripcion: role.descripcion,
    });
    assignments_by_user.set(row.usuario_id, list);
  }

  const users: AccesoUsuarioListItem[] = (
    (usersRes.data || []) as Array<{
      id: number;
      nombre_apellido: string;
      email_corporativo: string | null;
      cargo: string | null;
      esta_activo: boolean | null;
      departamento: number | null;
    }>
  ).map((u) => ({
    id: u.id,
    nombre: u.nombre_apellido,
    email: u.email_corporativo,
    cargo: u.cargo,
    activo: u.esta_activo,
    departamento:
      u.departamento != null ? dept_names.get(u.departamento) || null : null,
    app_count: app_count_by_user.get(u.id) || 0,
    assignments: (assignments_by_user.get(u.id) || []).sort((a, b) =>
      a.app_nombre.localeCompare(b.app_nombre, "es"),
    ),
  }));

  const app_id_by_slug = new Map(apps.map((a) => [a.slug, a.id]));
  const modules_by_slug = new Map<string, AccesoModule>();
  for (const [slug, app_slug] of Object.entries(MODULE_HOME_APP)) {
    modules_by_slug.set(slug, {
      slug,
      nombre: MODULE_LABELS[slug] || slug,
      descripcion: null,
      app_id: app_id_by_slug.get(app_slug) ?? null,
    });
  }
  for (const row of (modulesRes.data || []) as Array<{
    slug: string;
    nombre: string;
    descripcion: string | null;
    app_id: number | null;
  }>) {
    modules_by_slug.set(row.slug, {
      slug: row.slug,
      nombre: row.nombre,
      descripcion: row.descripcion,
      app_id: row.app_id != null ? num(row.app_id) : null,
    });
  }
  const modules = [...modules_by_slug.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );

  const actions_by_slug = new Map<string, AccesoAction>(
    ACTION_CATALOG.map((a) => [
      a.slug,
      { slug: a.slug, nombre: a.nombre, descripcion: a.descripcion },
    ]),
  );
  for (const row of (actionsRes.data || []) as Array<{
    slug: string;
    nombre: string;
    descripcion: string | null;
  }>) {
    actions_by_slug.set(row.slug, {
      slug: row.slug,
      nombre: row.nombre,
      descripcion: row.descripcion,
    });
  }
  const actions = [...actions_by_slug.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );

  return { apps, roles, permissions, users, modules, actions };
}

export async function load_usuario_ficha(
  usuario_id: number,
): Promise<AccesoUsuarioFicha | null> {
  const catalog = await load_acceso_catalog();
  const user = catalog.users.find((u) => u.id === usuario_id);
  if (!user) return null;

  const supabase = await require_ted_accesos();
  const { data, error } = await supabase
    .schema("authprisma")
    .from("vw_permisos_usuarios")
    .select(
      "app_id, app_nombre, app_slug, role_id, role_nombre, role_slug, permisos_slugs, asignacion_fecha",
    )
    .eq("usuario_id", usuario_id);
  if (error) throw new Error(error.message);

  const apps = (
    (data || []) as Array<{
      app_id: number | null;
      app_nombre: string | null;
      app_slug: string | null;
      role_id: number | null;
      role_nombre: string | null;
      role_slug: string | null;
      permisos_slugs: string[] | null;
      asignacion_fecha: string | null;
    }>
  )
    .filter((row) => row.app_id != null && row.role_id != null)
    .map((row) => {
      const role = catalog.roles.find((r) => r.id === num(row.role_id));
      return {
        app_id: num(row.app_id),
        app_slug: row.app_slug || "",
        app_nombre: row.app_nombre || "",
        role_id: num(row.role_id),
        role_slug: row.role_slug || "",
        role_nombre: row.role_nombre || "",
        role_descripcion: role?.descripcion ?? null,
        permission_slugs: row.permisos_slugs || [],
        asignacion_fecha: row.asignacion_fecha,
      };
    });

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    cargo: user.cargo,
    activo: user.activo,
    departamento: user.departamento,
    apps,
  };
}
