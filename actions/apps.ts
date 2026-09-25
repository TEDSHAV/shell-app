"use server";

import { cache } from "react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { buildFrameUrl } from "@/lib/frame-url";

/**
 * Cached per-request `auth.getClaims()` lookup.
 *
 * The shell layout, sidebar (via getUserRole), and dashboard page all need
 * the authenticated user's claims. Without this shared cache, each caller
 * creates its own Supabase client and calls getClaims() independently —
 * 3 network round-trips per request just for JWT validation. React cache()
 * deduplicates these into a single call per request.
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getClaims();
});

export async function getFrameUrl(
  appId: string,
  subPath?: string,
): Promise<string> {
  return buildFrameUrl(appId, subPath);
}

/** Usuario con rol asignado en la app Administración (authprisma id=4, slug sadministracion). */
export async function isSadministracionUser(): Promise<boolean> {
  const roles = await getUserRolesByApp();
  return Object.prototype.hasOwnProperty.call(roles, "sadministracion");
}

export async function isSgestionAdmin(): Promise<boolean> {
  const [roles, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole(),
  ]);
  const appRole = roles.sgestion?.toLowerCase();
  const lowerGlobal = globalRole?.toLowerCase();
  return appRole === "admin" || appRole === "superadmin" || lowerGlobal === "admin" || lowerGlobal === "superadmin";
}

export async function isSgestionGestorClientes(): Promise<boolean> {
  const roles = await getUserRolesByApp();
  return roles.sgestion?.toLowerCase() === "gestor_clientes";
}

export async function canAccessSgestionReportes(): Promise<boolean> {
  if (await isSgestionAdmin()) return true;
  if (await isSgestionGestorClientes()) return true;
  if (await isSgestionGestorMarketing()) return true;
  const perms = await getUserPermissionsByApp();
  const sgestion = perms.sgestion ?? [];
  return (
    sgestion.includes("reportes:access:presupuestos") ||
    sgestion.includes("reportes:access:leads") ||
    sgestion.includes("reportes:access")
  );
}

export async function getReportesHomePath(): Promise<string | null> {
  if (await canAccessSgestionReportes()) return "/reportes";
  return null;
}

export async function isSgestionGestorMarketing(): Promise<boolean> {
  const roles = await getUserRolesByApp();
  return roles.sgestion?.toLowerCase() === "gestor_marketing";
}

export async function canAccessSgestionMarketing(): Promise<boolean> {
  return (await isSgestionAdmin()) || (await isSgestionGestorMarketing());
}

/** Landing de Marketing. No usar como redirect desde `app/(shell)/marketing/page.tsx` (bucle). */
export async function getMarketingHomePath(): Promise<string | null> {
  if (await canAccessSgestionMarketing()) return "/marketing";
  return null;
}

export async function canManageClientesCuentas(): Promise<boolean> {
  if (await isSgestionAdmin()) return true;
  const perms = await getUserPermissionsByApp();
  return (perms.sgestion ?? []).includes("clientes:cuentas:manage");
}

export async function getUserRoleFromRoles(appRoles: Record<string, string>): Promise<string> {
  const roles = Object.values(appRoles).map(r => r.toLowerCase());
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("lider")) return "lider";
  return "user";
}

export const getUserRole = cache(async (): Promise<string> => {
  const { data } = await getClaims();

  if (data?.claims) {
    const role = (data.claims.user_role as string) ??
      (data.claims.app_metadata as Record<string, string> | undefined)?.role;

    if (role) {
      console.log("[getUserRole] Found role in claims:", role);
      return role;
    }
  }

  // Fallback: Check app-specific roles to see if user is an admin anywhere
  const appRoles = await getUserRolesByApp();
  const role = await getUserRoleFromRoles(appRoles);
  if (role !== "user") {
    console.log("[getUserRole] Derived role from app roles:", role);
  } else {
    console.log("[getUserRole] No administrative role found, defaulting to user");
  }
  return role;
});

/**
 * Cached per-request lookup of the current user's `usuarios` row.
 *
 * Both `getUserRolesByApp` and `getUserPermissionsByApp` need the `usuarios.id`
 * for the authenticated user. Previously each did its own `auth.getUser()`
 * (network call) + `usuarios` query, duplicating work when the sidebar rendered
 * both in the same request. Extracting the shared lookup here means the
 * `getUser()` call and `usuarios` query happen at most once per request.
 *
 * Also selects `esta_activo` so the shell layout can block deactivated users
 * without an extra query (piggybacks on this cached lookup).
 * Selects `departamento` so canAccessConsultaOSI / isTedMember can resolve the
 * department FK without re-querying `usuarios`.
 */
export const getUsuarioRecord = cache(async (): Promise<{
  id: number;
  esta_activo: boolean | null;
  departamento: number | null;
} | null> => {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, esta_activo, departamento")
      .eq("id_auth", user.id)
      .maybeSingle();

    if (!error && usuario) {
      return usuario as {
        id: number;
        esta_activo: boolean | null;
        departamento: number | null;
      };
    }

    // Fallback: lectura con service role si RLS/cliente de sesión falla.
    const admin = await createAdminClient();
    const { data: admin_usuario, error: admin_error } = await admin
      .from("usuarios")
      .select("id, esta_activo, departamento")
      .eq("id_auth", user.id)
      .maybeSingle();

    if (admin_error || !admin_usuario) return null;
    return admin_usuario as {
      id: number;
      esta_activo: boolean | null;
      departamento: number | null;
    };
  } catch {
    return null;
  }
});

/**
 * Cached per-request lookup of the current user's department name
 * (departamentos.nombre) resolved via the usuarios.departamento FK.
 *
 * Shared by canAccessConsultaOSI (actions/osi.ts) and isTedMember
 * (actions/ted.ts) so they don't each re-fetch auth.getUser + usuarios +
 * departamentos. Depends on getUsuarioRecord for the cached usuario row,
 * so the only new query is the single departamentos lookup.
 */
export const getUsuarioDepartamento = cache(async (): Promise<string | null> => {
  try {
    const usuario = await getUsuarioRecord();
    if (!usuario || usuario.departamento == null) return null;

    const supabase = await createClient();
    const { data: depto, error } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .maybeSingle();

    if (!error && depto?.nombre) return depto.nombre;

    const admin = await createAdminClient();
    const { data: admin_depto } = await admin
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .maybeSingle();
    return admin_depto?.nombre ?? null;
  } catch {
    return null;
  }
});

async function load_roles_by_usuario_id(
  usuario_id: number,
): Promise<Record<string, string>> {
  const map_rows = (
    rows: Array<{ app_slug: string; role_slug: string }> | null | undefined,
  ): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const row of rows || []) {
      if (row.app_slug && row.role_slug) {
        result[row.app_slug] = row.role_slug;
      }
    }
    return result;
  };

  // 1) RPC con sesión de usuario
  try {
    const user_client = await createClient();
    const { data, error } = await user_client.rpc("get_user_roles_by_app", {
      p_usuario_id: usuario_id,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return map_rows(data as Array<{ app_slug: string; role_slug: string }>);
    }
    if (error) {
      console.error(
        "[getUserRolesByApp] user RPC:",
        error.message || error.code || error,
      );
    }
  } catch (error) {
    console.error("[getUserRolesByApp] user RPC unexpected:", error);
  }

  const admin = await createAdminClient();

  // 2) RPC con service role
  try {
    const { data, error } = await admin.rpc("get_user_roles_by_app", {
      p_usuario_id: usuario_id,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return map_rows(data as Array<{ app_slug: string; role_slug: string }>);
    }
    if (error) {
      console.error(
        "[getUserRolesByApp] admin RPC:",
        error.message || error.code || error,
      );
    }
  } catch (error) {
    console.error("[getUserRolesByApp] admin RPC unexpected:", error);
  }

  // 3) Join directo authprisma
  try {
    const { data, error } = await admin
      .schema("authprisma")
      .from("user_app_roles")
      .select("apps(slug), roles(slug)")
      .eq("usuario_id", usuario_id);

    if (error) {
      console.error(
        "[getUserRolesByApp] admin select:",
        error.message || error.code || error,
      );
      return {};
    }

    const result: Record<string, string> = {};
    for (const row of (data || []) as Array<{
      apps: { slug: string } | { slug: string }[] | null;
      roles: { slug: string } | { slug: string }[] | null;
    }>) {
      const app = Array.isArray(row.apps) ? row.apps[0] : row.apps;
      const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
      if (app?.slug && role?.slug) {
        result[app.slug] = role.slug;
      }
    }
    return result;
  } catch (error) {
    console.error("[getUserRolesByApp] admin select unexpected:", error);
    return {};
  }
}

async function load_permissions_by_usuario_id(
  usuario_id: number,
): Promise<Record<string, string[]>> {
  const map_rows = (
    rows:
      | Array<{ app_slug: string; permission_slug: string }>
      | null
      | undefined,
  ): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    for (const row of rows || []) {
      if (!row.app_slug || !row.permission_slug) continue;
      if (!result[row.app_slug]) result[row.app_slug] = [];
      result[row.app_slug].push(row.permission_slug);
    }
    return result;
  };

  try {
    const user_client = await createClient();
    const { data, error } = await user_client.rpc(
      "get_user_permissions_by_app",
      { p_usuario_id: usuario_id },
    );
    if (!error && Array.isArray(data) && data.length > 0) {
      return map_rows(
        data as Array<{ app_slug: string; permission_slug: string }>,
      );
    }
  } catch (error) {
    console.error("[getUserPermissionsByApp] user RPC unexpected:", error);
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.rpc("get_user_permissions_by_app", {
      p_usuario_id: usuario_id,
    });
    if (!error && Array.isArray(data)) {
      return map_rows(
        data as Array<{ app_slug: string; permission_slug: string }>,
      );
    }
    if (error) {
      console.error(
        "[getUserPermissionsByApp] admin RPC:",
        error.message || error.code || error,
      );
    }
  } catch (error) {
    console.error("[getUserPermissionsByApp] admin RPC unexpected:", error);
  }

  return {};
}

export const getUserPermissionsByApp = cache(async (): Promise<Record<string, string[]>> => {
  try {
    const usuario = await getUsuarioRecord();
    if (!usuario) return {};
    return await load_permissions_by_usuario_id(usuario.id);
  } catch {
    return {};
  }
});

export const getUserRolesByApp = cache(async (): Promise<Record<string, string>> => {
  try {
    const usuario = await getUsuarioRecord();
    if (!usuario) return {};
    return await load_roles_by_usuario_id(usuario.id);
  } catch (error) {
    console.error("[getUserRolesByApp] Unexpected error:", error);
    return {};
  }
});

export async function getAppRoles(appSlug: string): Promise<string[]> {
  try {
    const supabase = await createClient();

    const { data: app, error: appError } = await supabase
      .schema("authprisma")
      .from("apps")
      .select("id")
      .eq("slug", appSlug)
      .single();

    if (appError || !app) return [];

    const { data: roles, error: rolesError } = await supabase
      .schema("authprisma")
      .from("roles")
      .select("slug")
      .eq("app_id", app.id);

    if (rolesError || !roles) return [];

    return roles.map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}
