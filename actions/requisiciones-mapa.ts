"use server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  isTedDept,
  is_requisicion_manual_tester,
  resolve_stamp_territory,
  type DeptCatalogRow,
} from "@/lib/requisiciones-dept-context";

export type MapaAprobadorDepto = {
  departamento: string;
  gerencia: string | null;
  coordinadores: string[];
  lideres: string[];
};

export type MapaRequisiciones = {
  departamentos: MapaAprobadorDepto[];
  tramite_nombres: string[];
};

function title_label(raw: string | null | undefined): string {
  const text = (raw || "").trim();
  if (!text) return "";
  return text
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function unique_sorted(names: string[]): string[] {
  return [...new Set(names.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function push_name(map: Map<string, Set<string>>, dept: string, nombre: string) {
  if (!dept.trim() || !nombre.trim()) return;
  const set = map.get(dept) ?? new Set<string>();
  set.add(nombre.trim());
  map.set(dept, set);
}

export async function get_mapa_requisiciones(): Promise<MapaRequisiciones> {
  const supabase = await createAdminClient();
  const auth = supabase.schema("authprisma");

  const [
    catalog_res,
    uar_res,
    roles_res,
    apps_res,
    rp_res,
    perms_res,
    gerencias_res,
  ] = await Promise.all([
    supabase
      .from("departamentos")
      .select("nombre, gerencia, coordinador")
      .eq("esta_activo", true),
    auth.from("user_app_roles").select("usuario_id, role_id, app_id"),
    auth.from("roles").select("id, slug, app_id"),
    auth.from("apps").select("id, slug"),
    auth.from("role_permissions").select("role_id, permission_id"),
    auth.from("permissions").select("id, slug"),
    supabase.from("gerencias").select("nombre, lider"),
  ]);

  for (const [label, error] of [
    ["catalog", catalog_res.error],
    ["uar", uar_res.error],
    ["roles", roles_res.error],
    ["apps", apps_res.error],
    ["rp", rp_res.error],
    ["perms", perms_res.error],
    ["gerencias", gerencias_res.error],
  ] as const) {
    if (error) console.error(`[get_mapa_requisiciones] ${label}`, error);
  }

  const catalog: DeptCatalogRow[] = (catalog_res.data || []).map((row) => ({
    nombre: row.nombre,
    gerencia: row.gerencia,
  }));

  const app_slug_by_id = new Map(
    (apps_res.data || []).map((row) => [row.id as number, String(row.slug)]),
  );
  const role_by_id = new Map(
    (roles_res.data || []).map((row) => [
      row.id as number,
      { slug: String(row.slug), app_id: row.app_id as number },
    ]),
  );
  const perm_slug_by_id = new Map(
    (perms_res.data || []).map((row) => [row.id as number, String(row.slug)]),
  );

  const slugs_by_role = new Map<number, string[]>();
  for (const row of rp_res.data || []) {
    const slug = perm_slug_by_id.get(row.permission_id as number);
    if (!slug) continue;
    const list = slugs_by_role.get(row.role_id as number) ?? [];
    list.push(slug);
    slugs_by_role.set(row.role_id as number, list);
  }

  const usuario_ids = [
    ...new Set(
      (uar_res.data || [])
        .map((row) => row.usuario_id as number | null)
        .filter((id): id is number => Boolean(id)),
    ),
  ];

  const { data: users, error: users_error } = usuario_ids.length
    ? await supabase
        .from("usuarios")
        .select("id, nombre_apellido")
        .in("id", usuario_ids)
        .eq("esta_activo", true)
    : { data: [] as { id: number; nombre_apellido: string | null }[], error: null };
  if (users_error) console.error("[get_mapa_requisiciones] users", users_error);

  const nombre_by_id = new Map<number, string>();
  for (const user of users || []) {
    if (user.nombre_apellido?.trim()) {
      nombre_by_id.set(user.id, user.nombre_apellido.trim());
    }
  }

  const roles_by_user = new Map<number, Record<string, string>>();
  const slugs_by_user = new Map<number, string[]>();
  for (const row of uar_res.data || []) {
    const usuario_id = row.usuario_id as number | null;
    const role = role_by_id.get(row.role_id as number);
    if (!usuario_id || !role) continue;
    const app_slug =
      app_slug_by_id.get(row.app_id as number) ||
      app_slug_by_id.get(role.app_id) ||
      "";
    if (!app_slug) continue;
    const roles = roles_by_user.get(usuario_id) ?? {};
    roles[app_slug] = role.slug;
    roles_by_user.set(usuario_id, roles);
    const slugs = slugs_by_user.get(usuario_id) ?? [];
    slugs.push(...(slugs_by_role.get(row.role_id as number) ?? []));
    slugs_by_user.set(usuario_id, slugs);
  }

  const organigram_coord_by_user = new Map<number, string[]>();
  for (const row of catalog_res.data || []) {
    if (!row.coordinador || !row.nombre) continue;
    const list = organigram_coord_by_user.get(row.coordinador) ?? [];
    list.push(row.nombre);
    organigram_coord_by_user.set(row.coordinador, list);
  }

  const led_gerencias_by_user = new Map<number, string[]>();
  for (const row of gerencias_res.data || []) {
    if (!row.lider || !row.nombre) continue;
    const list = led_gerencias_by_user.get(row.lider) ?? [];
    list.push(row.nombre);
    led_gerencias_by_user.set(row.lider, list);
  }

  const coord_map = new Map<string, Set<string>>();
  const lider_map = new Map<string, Set<string>>();
  const tramite = new Set<string>();

  for (const usuario_id of usuario_ids) {
    const nombre = nombre_by_id.get(usuario_id);
    if (!nombre) continue;
    const roles_by_app = roles_by_user.get(usuario_id) ?? {};
    if (is_requisicion_manual_tester(roles_by_app)) continue;
    const stamp = resolve_stamp_territory({
      slugs: slugs_by_user.get(usuario_id) ?? [],
      roles_by_app,
      catalog,
      organigram_coord_depts: organigram_coord_by_user.get(usuario_id) ?? [],
      led_gerencias: led_gerencias_by_user.get(usuario_id) ?? [],
    });
    if (stamp.can_process) tramite.add(nombre);
    for (const dept of stamp.coord_depts) push_name(coord_map, dept, nombre);
    for (const dept of stamp.lider_depts) push_name(lider_map, dept, nombre);
  }

  const departamentos: MapaAprobadorDepto[] = catalog
    .filter((row) => row.nombre && !isTedDept(row.nombre))
    .map((row) => ({
      departamento: title_label(row.nombre),
      gerencia: row.gerencia ? title_label(row.gerencia) : null,
      coordinadores: unique_sorted([
        ...(coord_map.get(row.nombre)?.values() ?? []),
      ]),
      lideres: unique_sorted([...(lider_map.get(row.nombre)?.values() ?? [])]),
    }))
    .sort((a, b) => {
      const g = (a.gerencia || "").localeCompare(b.gerencia || "", "es");
      return g !== 0 ? g : a.departamento.localeCompare(b.departamento, "es");
    });

  return {
    departamentos,
    tramite_nombres: unique_sorted([...tramite]),
  };
}
