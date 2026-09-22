"use server";

import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserPermissionsByApp, getUserRolesByApp } from "@/actions/apps";
import {
  catalog_names_for_keys,
  dept_in_keys,
  flatten_permission_slugs,
  is_admin_operative,
  organigram_lider_dept_names,
  request_dept_keys,
  stamp_coord_dept_keys,
  stamp_lider_dept_keys,
  type DeptCatalogRow,
} from "@/lib/requisiciones-dept-context";
import { deptNameInList } from "@/lib/requisiciones-gerencia";
import {
  REQ_CONFIG_MANAGE,
  REQ_GESTION_APPROVE_COORD,
  REQ_GESTION_APPROVE_LIDER,
  REQ_GESTION_EDIT,
  REQ_GESTION_PROCESS,
  REQ_SOLICITUD_ACCESS,
  REQ_SOLICITUD_ACCESS_DEPTO,
  REQ_SOLICITUD_CREATE,
  REQ_SOLICITUD_EDIT,
} from "@/lib/requisiciones-slugs";

export const getCurrentUserUsuarioId = cache(async (): Promise<number | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();
    return usuario?.id ?? null;
  } catch {
    return null;
  }
});

export const getCurrentUserDepartment = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = await createAdminClient();
    const { data: usuario } = await admin
      .from("usuarios")
      .select("departamentos!usuarios_departamento_fkey(nombre)")
      .eq("id_auth", user.id)
      .single();
    return (usuario?.departamentos as { nombre?: string } | null)?.nombre || null;
  } catch {
    return null;
  }
});

export type RequisicionAccess = {
  usuario_id: number | null;
  slugs: string[];
  roles_by_app: Record<string, string>;
  home_dept: string | null;
  catalog: DeptCatalogRow[];
  request_depts: string[];
  coord_depts: string[];
  lider_depts: string[];
  can_create: boolean;
  can_access_own: boolean;
  can_access_depto: boolean;
  can_edit_own: boolean;
  can_process: boolean;
  can_edit_tramite: boolean;
  can_approve_coord: boolean;
  can_approve_lider: boolean;
  can_edit_config: boolean;
  can_select_dept: boolean;
};

const get_departamento_catalog = cache(async (): Promise<DeptCatalogRow[]> => {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("departamentos")
    .select("nombre, gerencia")
    .eq("esta_activo", true);
  if (error) {
    console.error("[get_departamento_catalog]", error);
    return [];
  }
  return (data || []) as DeptCatalogRow[];
});

const get_led_gerencia_nombres = cache(async (usuario_id: number | null): Promise<string[]> => {
  if (!usuario_id) return [];
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("gerencias")
      .select("nombre")
      .eq("lider", usuario_id);
    if (error) {
      console.error("[get_led_gerencia_nombres]", error);
      return [];
    }
    return (data || [])
      .map((row: { nombre: string | null }) => row.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
  } catch {
    return [];
  }
});

export const getRequisicionAccess = cache(async (): Promise<RequisicionAccess> => {
  const [perms_by_app, roles_by_app, home_dept, usuario_id, catalog] = await Promise.all([
    getUserPermissionsByApp(),
    getUserRolesByApp(),
    getCurrentUserDepartment(),
    getCurrentUserUsuarioId(),
    get_departamento_catalog(),
  ]);
  const led_gerencias = await get_led_gerencia_nombres(usuario_id);
  const slugs = flatten_permission_slugs(perms_by_app);
  const slug_set = new Set(slugs);
  const can_approve_coord =
    slug_set.has(REQ_GESTION_APPROVE_COORD) ||
    stamp_coord_dept_keys(roles_by_app).size > 0;
  const can_approve_lider =
    slug_set.has(REQ_GESTION_APPROVE_LIDER) ||
    stamp_lider_dept_keys(roles_by_app).size > 0 ||
    led_gerencias.length > 0;

  const request_depts = catalog_names_for_keys(
    catalog,
    request_dept_keys({ home_dept, roles_by_app }),
  );
  const coord_depts = can_approve_coord
    ? catalog_names_for_keys(catalog, stamp_coord_dept_keys(roles_by_app))
    : [];
  const lider_depts = can_approve_lider
    ? [...new Set([
        ...catalog_names_for_keys(catalog, stamp_lider_dept_keys(roles_by_app)),
        ...organigram_lider_dept_names(catalog, led_gerencias),
      ])]
    : [];

  return {
    usuario_id,
    slugs,
    roles_by_app,
    home_dept,
    catalog,
    request_depts,
    coord_depts,
    lider_depts,
    can_create: slug_set.has(REQ_SOLICITUD_CREATE),
    can_access_own: slug_set.has(REQ_SOLICITUD_ACCESS) || slug_set.has(REQ_SOLICITUD_CREATE),
    can_access_depto: slug_set.has(REQ_SOLICITUD_ACCESS_DEPTO),
    can_edit_own: slug_set.has(REQ_SOLICITUD_EDIT),
    can_process: slug_set.has(REQ_GESTION_PROCESS),
    can_edit_tramite: slug_set.has(REQ_GESTION_EDIT) || slug_set.has(REQ_GESTION_PROCESS),
    can_approve_coord,
    can_approve_lider,
    can_edit_config: slug_set.has(REQ_CONFIG_MANAGE),
    can_select_dept: is_admin_operative(roles_by_app),
  };
});

export async function user_covers_coord_dept(deptName: string | null | undefined) {
  const access = await getRequisicionAccess();
  return access.can_approve_coord && dept_in_keys(deptName, stamp_coord_dept_keys(access.roles_by_app));
}

export async function user_covers_lider_dept(deptName: string | null | undefined) {
  const access = await getRequisicionAccess();
  return access.can_approve_lider && deptNameInList(deptName, access.lider_depts);
}

export async function list_request_departments() {
  const access = await getRequisicionAccess();
  return access.request_depts.map((nombre) => ({
    nombre,
    gerencia: access.catalog.find((row) => row.nombre === nombre)?.gerencia || "",
  }));
}
