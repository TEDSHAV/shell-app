"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppById } from "@/config/apps";

export async function getFrameUrl(appId: string, subPath?: string): Promise<string> {
  const app = getAppById(appId)!;
  const path = subPath ? `/${subPath}` : "";
  return `${app.upstreamUrl}${path}`;
}

export async function getUserRole(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return "user";
  return (
    (data.claims.user_role as string) ??
    (data.claims.app_metadata as Record<string, string> | undefined)?.role ??
    "user"
  );
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
