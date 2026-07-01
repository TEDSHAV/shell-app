"use server";

import { createClient } from "@/lib/supabase/server";
import { buildFrameUrl } from "@/lib/frame-url";

export async function getFrameUrl(
  appId: string,
  subPath?: string,
): Promise<string> {
  return buildFrameUrl(appId, subPath);
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
  return (await isSgestionAdmin()) || (await isSgestionGestorClientes());
}

export async function getReportesHomePath(): Promise<string | null> {
  if (await isSgestionAdmin()) return "/reportes/presupuestos";
  if (await isSgestionGestorClientes()) return "/reportes/presupuestos/mi-avance";
  return null;
}

export async function isSgestionGestorMarketing(): Promise<boolean> {
  const roles = await getUserRolesByApp();
  return roles.sgestion?.toLowerCase() === "gestor_marketing";
}

export async function canAccessSgestionMarketing(): Promise<boolean> {
  return (await isSgestionAdmin()) || (await isSgestionGestorMarketing());
}

export async function getMarketingHomePath(): Promise<string | null> {
  if (await canAccessSgestionMarketing()) return "/marketing";
  return null;
}

export async function canManageClientesCuentas(): Promise<boolean> {
  if (await isSgestionAdmin()) return true;
  const perms = await getUserPermissionsByApp();
  return (perms.sgestion ?? []).includes("clientes:cuentas:manage");
}

export async function getUserRole(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  
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
  const roles = Object.values(appRoles).map(r => r.toLowerCase());
  
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("lider")) return "lider";

  console.log("[getUserRole] No administrative role found, defaulting to user");
  return "user";
}

export async function getUserPermissionsByApp(): Promise<Record<string, string[]>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();

    if (usuarioError || !usuario) return {};

    const { data: rows, error } = await supabase
      .rpc("get_user_permissions_by_app", { p_usuario_id: usuario.id });

    if (error || !rows) return {};

    const result: Record<string, string[]> = {};
    for (const row of rows as { app_slug: string; permission_slug: string }[]) {
      if (!result[row.app_slug]) result[row.app_slug] = [];
      result[row.app_slug].push(row.permission_slug);
    }

    return result;
  } catch {
    return {};
  }
}

export async function getUserRolesByApp(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id_auth", user.id)
      .single();

    if (usuarioError || !usuario) return {};

    const { data: userAppRoles, error: rolesError } = await supabase
      .schema("authprisma")
      .from("user_app_roles")
      .select(`
        app_id,
        roles (
          slug
        )
      `)
      .eq("usuario_id", usuario.id);

    if (rolesError || !userAppRoles) {
      console.error("[getUserRolesByApp] Roles error or no data:", rolesError);
      return {};
    }

    // Get app slugs by their IDs
    const { data: apps, error: appsError } = await supabase
      .schema("authprisma")
      .from("apps")
      .select("id, slug");

    if (appsError || !apps) {
      console.error("[getUserRolesByApp] Apps error or no data:", appsError);
      return {};
    }

    const appMap = new Map(apps.map((app: { id: bigint; slug: string }) => [app.id, app.slug]));

    const result: Record<string, string> = {};
    for (const uar of userAppRoles as Array<{ app_id: bigint; roles: { slug: string } | { slug: string }[] }>) {
      const appSlug = appMap.get(uar.app_id);
      if (appSlug && uar.roles) {
        // Handle both single object and array
        const role = Array.isArray(uar.roles) ? uar.roles[0]?.slug : uar.roles.slug;
        if (role) {
          result[appSlug] = role;
        }
      }
    }

    console.log("[getUserRolesByApp] Resolved app roles:", result);
    return result;
  } catch (error) {
    console.error("[getUserRolesByApp] Unexpected error:", error);
    return {};
  }
}

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
