"use server";

import { createAdminClient } from "@/lib/supabase/server";

const SGESTION_APP_SLUG = "sgestion";

/** Roles de sgestion (authprisma) que reciben todo cambio de estatus OSI. */
const SGESTION_BROADCAST_ROLE_SLUGS = [
  "gestor_financiero",
  "admin",
  "superadmin",
] as const;

async function getSgestionAuthIdsByRoles(
  roleSlugs: readonly string[],
): Promise<string[]> {
  const adminClient = await createAdminClient();

  const { data: app, error: appError } = await adminClient
    .schema("authprisma")
    .from("apps")
    .select("id")
    .eq("slug", SGESTION_APP_SLUG)
    .single();

  if (appError || !app) {
    console.error(
      "[osi-notifications] Could not resolve sgestion app:",
      appError,
    );
    return [];
  }

  const { data: roles, error: rolesError } = await adminClient
    .schema("authprisma")
    .from("roles")
    .select("id")
    .eq("app_id", app.id)
    .in("slug", [...roleSlugs]);

  if (rolesError || !roles?.length) {
    console.error(
      "[osi-notifications] Could not resolve sgestion roles:",
      rolesError,
    );
    return [];
  }

  const roleIds = roles.map((role) => role.id);

  const { data: userAppRoles, error: uarError } = await adminClient
    .schema("authprisma")
    .from("user_app_roles")
    .select("usuario_id")
    .eq("app_id", app.id)
    .in("role_id", roleIds);

  if (uarError || !userAppRoles?.length) {
    console.error(
      "[osi-notifications] Could not resolve sgestion role users:",
      uarError,
    );
    return [];
  }

  const usuarioIds = [
    ...new Set(userAppRoles.map((row) => row.usuario_id)),
  ];

  const { data: usuarios, error: usuariosError } = await adminClient
    .from("usuarios")
    .select("id_auth")
    .in("id", usuarioIds)
    .not("id_auth", "is", null)
    .eq("esta_activo", true);

  if (usuariosError || !usuarios?.length) {
    console.error(
      "[osi-notifications] Could not resolve usuario auth ids:",
      usuariosError,
    );
    return [];
  }

  return usuarios
    .map((usuario) => usuario.id_auth)
    .filter((idAuth): idAuth is string => Boolean(idAuth));
}

async function getEjecutivoResponsableAuthId(
  ejecutivoNombre: string,
): Promise<string | null> {
  const adminClient = await createAdminClient();

  const { data: ejecutivoUser, error } = await adminClient
    .from("usuarios")
    .select("id_auth")
    .ilike("nombre_apellido", ejecutivoNombre)
    .not("id_auth", "is", null)
    .eq("esta_activo", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[osi-notifications] Could not resolve ejecutivo responsable:",
      error,
    );
    return null;
  }

  return ejecutivoUser?.id_auth ?? null;
}

export async function notifyOsiStatusChanged(input: {
  osiId: number;
  newStatusId: number;
  nroOsi: string;
  newStatusName: string;
  ejecutivoNegocios?: string | null;
}): Promise<void> {
  try {
    const recipientIds = new Set<string>();

    const roleRecipients = await getSgestionAuthIdsByRoles(
      SGESTION_BROADCAST_ROLE_SLUGS,
    );
    for (const idAuth of roleRecipients) {
      recipientIds.add(idAuth);
    }

    const ejecutivoNombre = input.ejecutivoNegocios?.trim();
    if (ejecutivoNombre) {
      const ejecutivoAuthId =
        await getEjecutivoResponsableAuthId(ejecutivoNombre);
      if (ejecutivoAuthId) {
        recipientIds.add(ejecutivoAuthId);
      }
    }

    if (recipientIds.size === 0) return;

    const dedupeBase = `osi:${input.osiId}:status_changed:${input.newStatusId}:${Date.now()}`;
    const rows = [...recipientIds].map((recipientIdAuth) => ({
      app_slug: "shell",
      event_key: "osi_status_changed",
      recipient_id_auth: recipientIdAuth,
      title: "Estado de OSI Actualizado",
      body: `El estado de la OSI ${input.nroOsi} ha cambiado a "${input.newStatusName}"`,
      link_path: "/consulta-osi",
      dedupe_key: `${dedupeBase}:${recipientIdAuth}`,
      priority: 2,
    }));

    const adminClient = await createAdminClient();
    const { error: notifError } = await adminClient
      .schema("notify")
      .from("inbox")
      .insert(rows);

    if (notifError) {
      console.error(
        "[osi-notifications] Error inserting OSI status notifications:",
        notifError,
      );
    }
  } catch (err) {
    console.error("[osi-notifications] Unexpected error:", err);
  }
}
